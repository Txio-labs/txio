import { executeSuiRpc, looksLikeSuiAddress } from '../suiService';
import type { Network } from '../../types';
import { DiscoveryError, type ChainDiscoveryAdapter, type DiscoveredFunction, type DiscoveredModule, type DiscoveredPackage, type DiscoveredParameter, type DiscoveredTypeParameter, type ParameterKind, type ParameterResolution } from './types';
import type { SuiMoveNormalizedModule, SuiMoveNormalizedType, SuiNormalizedModulesByPackage } from './suiTypes';

/** Renders a normalized Move type back to its source-like string, e.g. "vector<u8>", "0x2::coin::Coin<0x2::sui::SUI>". */
export const renderSuiType = (t: SuiMoveNormalizedType, typeParamNames?: string[]): string => {
    if (typeof t === 'string') {
        switch (t) {
            case 'Address':
                return 'address';
            case 'Bool':
                return 'bool';
            case 'Signer':
                return 'signer';
            default:
                return t.toLowerCase(); // U8..U256
        }
    }
    if ('TypeParameter' in t) return typeParamNames?.[t.TypeParameter] ?? `T${t.TypeParameter}`;
    if ('Reference' in t) return `&${renderSuiType(t.Reference, typeParamNames)}`;
    if ('MutableReference' in t) return `&mut ${renderSuiType(t.MutableReference, typeParamNames)}`;
    if ('Vector' in t) return `vector<${renderSuiType(t.Vector, typeParamNames)}>`;
    const s = t.Struct;
    const args = s.typeArguments.length ? `<${s.typeArguments.map((a) => renderSuiType(a, typeParamNames)).join(', ')}>` : '';
    return `${s.address}::${s.module}::${s.name}${args}`;
};

/** True for `&mut TxContext`/`&TxContext` — always auto-supplied, never shown as a field. */
const isTxContext = (t: SuiMoveNormalizedType): boolean => {
    const inner = typeof t === 'object' && 'MutableReference' in t ? t.MutableReference : typeof t === 'object' && 'Reference' in t ? t.Reference : null;
    return Boolean(inner && typeof inner === 'object' && 'Struct' in inner && inner.Struct.module === 'tx_context' && inner.Struct.name === 'TxContext');
};

/** True for `0x2::coin::Coin<...>` (by reference or value) — the wallet-owned-coin-selector case. */
const isCoinType = (t: SuiMoveNormalizedType): { isCoin: boolean; typeArg?: SuiMoveNormalizedType } => {
    const inner = typeof t === 'object' && 'MutableReference' in t ? t.MutableReference : typeof t === 'object' && 'Reference' in t ? t.Reference : t;
    if (typeof inner === 'object' && 'Struct' in inner && inner.Struct.address === '0x2' && inner.Struct.module === 'coin' && inner.Struct.name === 'Coin') {
        return { isCoin: true, typeArg: inner.Struct.typeArguments[0] };
    }
    return { isCoin: false };
};

/** Classifies a single normalized parameter type into a DiscoveredParameter's kind/resolution. */
const classifyParameter = (t: SuiMoveNormalizedType, index: number, typeParamNames: string[]): DiscoveredParameter => {
    const typeStr = renderSuiType(t, typeParamNames);
    const name = `arg${index}`;

    if (isTxContext(t)) {
        return { name, type: typeStr, kind: 'transaction_context', required: false, resolution: 'automatic' };
    }

    const coin = isCoinType(t);
    if (coin.isCoin) {
        return {
            name: 'Coin',
            type: typeStr,
            kind: 'coin',
            required: true,
            resolution: 'wallet',
            isMutable: typeof t === 'object' && 'MutableReference' in t,
            objectType: coin.typeArg && typeof coin.typeArg !== 'string' && 'TypeParameter' in coin.typeArg ? undefined : renderSuiType(coin.typeArg as SuiMoveNormalizedType, typeParamNames),
            genericSlot: coin.typeArg && typeof coin.typeArg === 'object' && 'TypeParameter' in coin.typeArg ? coin.typeArg.TypeParameter : undefined
        };
    }

    // Any other &Struct/&mut Struct is a plain object reference — Sui can't
    // tell us statically whether it's shared or owned (that's runtime
    // object metadata, resolved separately via sui_getObject), so it's
    // offered as a wallet-object selector rather than a raw ID text field.
    const isReference = typeof t === 'object' && ('Reference' in t || 'MutableReference' in t);
    const inner = typeof t === 'object' && 'MutableReference' in t ? t.MutableReference : typeof t === 'object' && 'Reference' in t ? t.Reference : t;
    if (typeof inner === 'object' && 'Struct' in inner) {
        const hasGeneric = inner.Struct.typeArguments.some((a) => typeof a === 'object' && 'TypeParameter' in a);
        return {
            name: inner.Struct.name,
            type: typeStr,
            kind: 'object',
            required: true,
            resolution: 'selector',
            isMutable: typeof t === 'object' && 'MutableReference' in t,
            objectType: hasGeneric ? undefined : renderSuiType(inner, typeParamNames)
        };
    }

    if (typeof t === 'object' && 'TypeParameter' in t) {
        return { name, type: typeStr, kind: 'generic', required: true, resolution: 'user_input', genericSlot: t.TypeParameter };
    }

    if (typeof t === 'object' && 'Vector' in t) {
        return { name, type: typeStr, kind: 'vector', required: true, resolution: 'user_input' };
    }

    if (typeof t === 'string' && t === 'Address') {
        return { name: 'Address', type: typeStr, kind: 'address', required: true, resolution: 'user_input' };
    }

    if (isReference) {
        // A reference to something not handled above (e.g. &Signer) — not a
        // shape this builder can safely auto-resolve or ask for as text.
        return { name, type: typeStr, kind: 'unknown', required: true, resolution: 'unsupported' };
    }

    // Bool/U8..U256 — plain value the user must type; nothing on-chain to infer it from.
    return { name, type: typeStr, kind: 'primitive', required: true, resolution: 'user_input' };
};

const typeParamNamesFor = (count: number): string[] => Array.from({ length: count }, (_, i) => `T${i}`);

const toDiscoveredFunction = (funcName: string, moduleName: string, fn: SuiMoveNormalizedModule['exposedFunctions'][string]): DiscoveredFunction => {
    const typeParamNames = typeParamNamesFor(fn.typeParameters.length);
    return {
        name: funcName,
        module: moduleName,
        visibility: fn.visibility,
        isEntry: fn.isEntry,
        typeParameters: fn.typeParameters.map((tp, i): DiscoveredTypeParameter => ({ name: typeParamNames[i], constraints: tp.abilities })),
        parameters: fn.parameters.map((p, i) => classifyParameter(p, i, typeParamNames)),
        returnTypes: fn.return.map((r) => renderSuiType(r, typeParamNames))
    };
};

/** Only functions a Programmable Transaction Block can actually call: public entry points. */
const isCallable = (fn: SuiMoveNormalizedModule['exposedFunctions'][string]): boolean =>
    fn.isEntry || fn.visibility === 'Public';

export class SuiDiscoveryAdapter implements ChainDiscoveryAdapter {
    readonly chain = 'sui' as const;
    readonly isSupported = true;

    async discoverPackage(identifier: string, network: Network): Promise<DiscoveredPackage> {
        const packageId = identifier.trim();
        if (!looksLikeSuiAddress(packageId)) {
            throw new DiscoveryError(`"${identifier}" isn't a valid Sui package ID — expected a 0x-prefixed 64-hex-character address.`, {
                code: 'INVALID_IDENTIFIER',
                chain: this.chain
            });
        }

        let raw: SuiNormalizedModulesByPackage;
        try {
            const { result, status } = await executeSuiRpc(network, 'sui_getNormalizedMoveModulesByPackage', [packageId]);
            if (status >= 400 || !result || typeof result !== 'object') {
                throw new DiscoveryError(`Package ${packageId} was not found on ${network}, or has no Move modules.`, {
                    code: 'NOT_FOUND',
                    chain: this.chain
                });
            }
            raw = result as SuiNormalizedModulesByPackage;
        } catch (err) {
            if (err instanceof DiscoveryError) throw err;
            throw new DiscoveryError(
                err instanceof Error ? err.message : `Failed to fetch package ${packageId} from ${network}.`,
                { code: 'RPC_FAILURE', chain: this.chain, cause: err }
            );
        }

        const modules: DiscoveredModule[] = Object.entries(raw).map(([moduleName, mod]) => ({
            name: moduleName,
            functions: Object.entries(mod.exposedFunctions)
                .filter(([, fn]) => isCallable(fn))
                .map(([funcName, fn]) => toDiscoveredFunction(funcName, moduleName, fn))
        }));

        return {
            chain: this.chain,
            network,
            identifier: packageId,
            modules,
            metadata: { source: 'sui_getNormalizedMoveModulesByPackage' }
        };
    }
}

export const suiDiscoveryAdapter = new SuiDiscoveryAdapter();
