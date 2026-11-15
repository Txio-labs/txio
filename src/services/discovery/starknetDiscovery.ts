import type { Network } from '../../types';
import type { ChainDiscoveryAdapter, DiscoveredFunction, DiscoveredModule, DiscoveredPackage, ParameterKind } from './types';
import { DiscoveryError } from './types';
import { getStarknetAbi, isStarknetAddress, listAbiFunctions, shortCairoType, type StarknetAbiFunction } from '../starknet';

const parameterKind = (type: string): ParameterKind => {
    const short = shortCairoType(type);
    if (short === 'ContractAddress' || short === 'ClassHash') return 'address';
    if (/^(Array|Span)</.test(short)) return 'vector';
    if (/^(felt252|bool|u\d+|i\d+|bytes31|ByteArray)$/.test(short)) return 'primitive';
    return 'unknown';
};

const toDiscovered = (fn: StarknetAbiFunction): DiscoveredFunction => ({
    name: fn.name,
    module: fn.interfaceName,
    visibility: 'Public',
    // "Entry" here means callable in a transaction: Starknet view functions can
    // be invoked too, but they change nothing, so the builder lists external ones.
    isEntry: fn.stateMutability === 'external',
    typeParameters: [],
    parameters: fn.inputs.map((input) => ({
        name: input.name,
        type: input.type,
        kind: parameterKind(input.type),
        required: true,
        resolution: 'user_input'
    })),
    returnTypes: fn.outputs.map((o) => o.type)
});

/**
 * Starknet contract discovery from the class ABI the node returns for the
 * deployed address. Cairo 1 interfaces become modules; Cairo 0 top-level
 * functions (and Cairo 1 functions outside an interface) go in a module
 * named "functions".
 */
export const starknetDiscoveryAdapter: ChainDiscoveryAdapter = {
    chain: 'starknet',
    isSupported: true,

    async discoverPackage(identifier: string, network: Network): Promise<DiscoveredPackage> {
        const address = identifier.trim();
        if (!isStarknetAddress(address)) {
            throw new DiscoveryError('Enter a contract address: 0x followed by up to 64 hex digits.', {
                code: 'INVALID_IDENTIFIER',
                chain: 'starknet'
            });
        }

        let functions: StarknetAbiFunction[];
        try {
            functions = listAbiFunctions(await getStarknetAbi(network, address));
        } catch (cause) {
            const message = cause instanceof Error ? cause.message : '';
            const notFound = /contract not found/i.test(message);
            throw new DiscoveryError(
                notFound ? `No contract is deployed at ${address} on ${network}.` : `Could not load the contract ABI: ${message || 'RPC error'}.`,
                { code: notFound ? 'NOT_FOUND' : 'RPC_FAILURE', chain: 'starknet', cause }
            );
        }

        const byModule = new Map<string, DiscoveredFunction[]>();
        for (const fn of functions) {
            const name = fn.interfaceName ? shortCairoType(fn.interfaceName) : 'functions';
            byModule.set(name, [...(byModule.get(name) ?? []), toDiscovered(fn)]);
        }
        const modules: DiscoveredModule[] = [...byModule].map(([name, fns]) => ({ name, functions: fns }));
        return { chain: 'starknet', network, identifier: address, modules };
    }
};
