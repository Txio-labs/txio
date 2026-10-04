import { APTOS_NETWORKS } from '@/lib/constants';
import type { Network } from '../../types';
import {
    DiscoveryError,
    type ChainDiscoveryAdapter,
    type DiscoveredFunction,
    type DiscoveredModule,
    type DiscoveredPackage,
    type DiscoveredParameter,
    type ParameterKind
} from './types';

/** Shape of `GET /accounts/{address}/modules` items (only the fields used here). */
export interface AptosModuleAbiResponse {
    abi?: {
        address: string;
        name: string;
        exposed_functions: {
            name: string;
            visibility: 'public' | 'private' | 'friend';
            is_entry: boolean;
            is_view: boolean;
            generic_type_params: { constraints: string[] }[];
            params: string[];
            return: string[];
        }[];
    };
}

const ADDRESS_RE = /^0x[0-9a-fA-F]{1,64}$/;
const MAX_PAGES = 10;

export const isAptosAddress = (value: string): boolean => ADDRESS_RE.test(value.trim());

/** `signer` and `&signer` are supplied by the connected wallet, never typed by the user. */
export const isSignerParam = (type: string): boolean => type === 'signer' || type === '&signer';

const PRIMITIVES = new Set(['bool', 'u8', 'u16', 'u32', 'u64', 'u128', 'u256', 'address']);

const kindFor = (type: string): ParameterKind => {
    if (isSignerParam(type)) return 'system';
    if (type === 'address') return 'address';
    if (PRIMITIVES.has(type)) return 'primitive';
    if (type.startsWith('vector<')) return 'vector';
    if (/^T\d+$/.test(type)) return 'generic';
    if (type.startsWith('0x1::object::Object<')) return 'object';
    return 'unknown';
};

const capitalize = (v: 'public' | 'private' | 'friend'): DiscoveredFunction['visibility'] =>
    v === 'public' ? 'Public' : v === 'friend' ? 'Friend' : 'Private';

/** Turns the fullnode's module ABIs into the normalized discovery shape. Pure, no I/O. */
export const parseAptosModules = (
    items: AptosModuleAbiResponse[]
): DiscoveredModule[] =>
    items
        .filter((item): item is Required<Pick<AptosModuleAbiResponse, 'abi'>> => Boolean(item.abi))
        .map(({ abi }) => ({
            name: abi.name,
            functions: abi.exposed_functions.map((fn): DiscoveredFunction => {
                const parameters: DiscoveredParameter[] = fn.params.map((type, index) => {
                    const signer = isSignerParam(type);
                    return {
                        name: signer ? 'signer' : `arg${index}`,
                        type,
                        kind: kindFor(type),
                        required: !signer,
                        resolution: signer ? 'wallet' : 'user_input'
                    };
                });
                return {
                    name: fn.name,
                    module: abi.name,
                    visibility: capitalize(fn.visibility),
                    isEntry: fn.is_entry,
                    typeParameters: fn.generic_type_params.map((tp, i) => ({
                        name: `T${i}`,
                        constraints: tp.constraints
                    })),
                    parameters,
                    returnTypes: fn.return
                };
            })
        }));

const fetchModules = async (base: string, address: string): Promise<AptosModuleAbiResponse[]> => {
    const modules: AptosModuleAbiResponse[] = [];
    let cursor: string | null = null;

    for (let page = 0; page < MAX_PAGES; page++) {
        const url = new URL(`${base}/accounts/${address}/modules`);
        url.searchParams.set('limit', '1000');
        if (cursor) url.searchParams.set('start', cursor);

        let response: Response;
        try {
            response = await fetch(url.toString());
        } catch (cause) {
            throw new DiscoveryError('Aptos fullnode unreachable.', { code: 'RPC_FAILURE', chain: 'aptos', cause });
        }

        if (response.status === 404) {
            throw new DiscoveryError(`No account found at ${address} on this network.`, {
                code: 'NOT_FOUND',
                chain: 'aptos'
            });
        }
        if (!response.ok) {
            throw new DiscoveryError(`Aptos fullnode returned HTTP ${response.status}.`, {
                code: 'RPC_FAILURE',
                chain: 'aptos'
            });
        }

        modules.push(...((await response.json()) as AptosModuleAbiResponse[]));
        cursor = response.headers.get('x-aptos-cursor');
        if (!cursor) break;
    }

    return modules;
};

export const aptosDiscoveryAdapter: ChainDiscoveryAdapter = {
    chain: 'aptos',
    isSupported: true,

    async discoverPackage(identifier: string, network: Network): Promise<DiscoveredPackage> {
        const address = identifier.trim();
        if (!isAptosAddress(address)) {
            throw new DiscoveryError('Enter a module address like 0x1.', {
                code: 'INVALID_IDENTIFIER',
                chain: 'aptos'
            });
        }

        const parsed = parseAptosModules(await fetchModules(APTOS_NETWORKS[network], address));
        if (parsed.length === 0) {
            throw new DiscoveryError(`No modules are published at ${address} on ${network}.`, {
                code: 'NOT_FOUND',
                chain: 'aptos'
            });
        }

        return { chain: 'aptos', network, identifier: address, modules: parsed };
    }
};
