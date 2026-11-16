import type { contract, xdr } from '@stellar/stellar-sdk';
import type { Network, StellarArgType } from '../../types';
import { exampleValue, isTextInput, loadStellarSpec, placeholderFor, SpecLoadError, type LoadedSpec } from '../stellar/spec';
import {
    DiscoveryError,
    type ChainDiscoveryAdapter,
    type DiscoveredFunction,
    type DiscoveredModule,
    type DiscoveredPackage,
    type ParameterKind
} from './types';

const CONTRACT_ID_RE = /^C[A-Z2-7]{55}$/;

export const isStellarContractId = (value: string): boolean => CONTRACT_ID_RE.test(value.trim());

/** Renders a Soroban spec type back to its Rust-like source form, e.g. "vec<address>", "option<i128>". */
export const renderStellarType = (t: xdr.ScSpecTypeDef): string => {
    const name = t.switch().name;
    switch (name) {
        case 'scSpecTypeOption':
            return `option<${renderStellarType(t.option().valueType())}>`;
        case 'scSpecTypeVec':
            return `vec<${renderStellarType(t.vec().elementType())}>`;
        case 'scSpecTypeMap':
            return `map<${renderStellarType(t.map().keyType())}, ${renderStellarType(t.map().valueType())}>`;
        case 'scSpecTypeResult':
            return `result<${renderStellarType(t.result().okType())}, ${renderStellarType(t.result().errorType())}>`;
        case 'scSpecTypeTuple':
            return `(${t.tuple().valueTypes().map(renderStellarType).join(', ')})`;
        case 'scSpecTypeBytesN':
            return `bytesn<${t.bytesN().n()}>`;
        case 'scSpecTypeUdt':
            return t.udt().name().toString();
        case 'scSpecTypeMuxedAddress':
            return 'muxed_address';
        default:
            return name.replace(/^scSpecType/, '').toLowerCase();
    }
};

const DIRECT_ARG_TYPES = new Set<StellarArgType>(['address', 'i128', 'u128', 'i64', 'u64', 'i32', 'u32', 'bool', 'string', 'symbol', 'bytes']);

/** The form argument type a spec type maps onto, or null when the form can't build that value. */
export const stellarArgTypeFor = (type: string): StellarArgType | null => {
    if (DIRECT_ARG_TYPES.has(type as StellarArgType)) return type as StellarArgType;
    if (type === 'muxed_address') return 'address';
    if (/^bytesn<\d+>$/.test(type)) return 'bytes';
    return null;
};

const kindFor = (type: string): ParameterKind => {
    if (type === 'address' || type === 'muxed_address') return 'address';
    if (type.startsWith('vec<')) return 'vector';
    return stellarArgTypeFor(type) ? 'primitive' : 'unknown';
};

const specInputHints = (spec: contract.Spec, type: xdr.ScSpecTypeDef) => {
    const multiline = !isTextInput(spec, type);
    return {
        placeholder: placeholderFor(spec, type),
        multiline,
        ...(multiline ? { example: JSON.stringify(exampleValue(spec, type), null, 2) } : {})
    };
};

const docOf = (value: { doc(): string | Buffer }): string | undefined => value.doc().toString().trim() || undefined;

/**
 * Turns a contract's spec functions into the normalized discovery shape.
 * With the full `spec`, every parameter is enterable (structured types take
 * JSON) and gets a placeholder; without it, only simple types are. Pure, no I/O.
 */
export const parseStellarSpec = (funcs: xdr.ScSpecFunctionV0[], spec?: contract.Spec): DiscoveredFunction[] =>
    funcs
        .map((fn) => ({ fn, name: fn.name().toString() }))
        // `__constructor` and other reserved names can't be invoked by a transaction.
        .filter(({ name }) => !name.startsWith('__'))
        .map(({ fn, name }): DiscoveredFunction => ({
            name,
            module: 'contract',
            visibility: 'Public',
            isEntry: true,
            typeParameters: [],
            doc: docOf(fn),
            parameters: fn.inputs().map((input) => {
                const type = renderStellarType(input.type());
                return {
                    name: input.name().toString(),
                    type,
                    kind: kindFor(type),
                    required: !type.startsWith('option<'),
                    resolution: spec || stellarArgTypeFor(type) ? 'user_input' : 'unsupported',
                    doc: docOf(input),
                    ...(spec ? specInputHints(spec, input.type()) : {})
                };
            }),
            returnTypes: fn.outputs().map(renderStellarType)
        }));

export const stellarDiscoveryAdapter: ChainDiscoveryAdapter = {
    chain: 'stellar',
    isSupported: true,

    async discoverPackage(identifier: string, network: Network): Promise<DiscoveredPackage> {
        const contractId = identifier.trim();
        if (!isStellarContractId(contractId)) {
            throw new DiscoveryError('Enter a contract address starting with C (56 characters).', {
                code: 'INVALID_IDENTIFIER',
                chain: 'stellar'
            });
        }

        let loaded: LoadedSpec;
        try {
            loaded = await loadStellarSpec(contractId, network, { fresh: true });
        } catch (cause) {
            if (cause instanceof SpecLoadError) {
                throw new DiscoveryError(cause.message, {
                    code: cause.code === 'NO_SPEC' ? 'METADATA_UNAVAILABLE' : 'NOT_FOUND',
                    chain: 'stellar',
                    cause
                });
            }
            throw new DiscoveryError(`Could not reach ${network} Soroban RPC.`, { code: 'RPC_FAILURE', chain: 'stellar', cause });
        }

        const functions = parseStellarSpec(loaded.spec.funcs(), loaded.spec);
        const modules: DiscoveredModule[] = [{ name: 'contract', functions }];
        const metadata =
            loaded.source === 'stellar-asset'
                ? { name: 'Stellar Asset Contract', source: 'built-in token interface', builtIn: true }
                : { source: 'contractspecv0' };
        return { chain: 'stellar', network, identifier: contractId, modules, metadata };
    }
};
