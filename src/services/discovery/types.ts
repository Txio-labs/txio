import type { ChainId, Network } from '../../types';

/**
 * Universal on-chain package/contract/program discovery — normalized across
 * chains, but each field is only ever populated from real chain/provider
 * data. A chain with no discovery source yet returns a DISCOVERY_UNAVAILABLE
 * error rather than fabricating modules/functions.
 */

export type ParameterKind =
    | 'primitive'
    | 'address'
    | 'object'
    | 'shared_object'
    | 'owned_object'
    | 'coin'
    | 'vector'
    | 'generic'
    | 'transaction_context'
    | 'system'
    | 'unknown';

export type ParameterResolution = 'automatic' | 'wallet' | 'selector' | 'user_input' | 'unsupported';

export interface DiscoveredParameter {
    /** Display name — Move normalized functions don't carry parameter names, so this may be positional ("arg0"). */
    name: string;
    /** The chain-native type string, e.g. "u64", "address", "0x2::coin::Coin<T0>". */
    type: string;
    kind: ParameterKind;
    required: boolean;
    resolution: ParameterResolution;
    /** True when `type` references one of the function's own type parameters (generics). */
    isMutable?: boolean;
    /** For a `coin`/`object` param: the fully-qualified struct type it must match, if known statically (not generic). */
    objectType?: string;
    /** Index into the function's type parameters this argument's generic slot corresponds to, if any. */
    genericSlot?: number;
}

export interface DiscoveredTypeParameter {
    /** Display name, e.g. "T0". Move doesn't carry real generic names either. */
    name: string;
    /** Ability constraints, e.g. ["Store", "Copy"] — empty when unconstrained. */
    constraints: string[];
}

export interface DiscoveredFunction {
    name: string;
    module: string;
    visibility: 'Public' | 'Private' | 'Friend';
    isEntry: boolean;
    typeParameters: DiscoveredTypeParameter[];
    parameters: DiscoveredParameter[];
    returnTypes: string[];
}

export interface DiscoveredModule {
    name: string;
    functions: DiscoveredFunction[];
}

export interface DiscoveredPackage {
    chain: ChainId;
    network: Network;
    identifier: string;
    modules: DiscoveredModule[];
    metadata?: {
        name?: string;
        version?: string;
        source?: string;
    };
}

export type DiscoveryErrorCode =
    | 'INVALID_IDENTIFIER'
    | 'NOT_FOUND'
    | 'METADATA_UNAVAILABLE'
    | 'MODULE_NOT_FOUND'
    | 'FUNCTION_NOT_FOUND'
    | 'RPC_FAILURE'
    | 'DISCOVERY_UNAVAILABLE';

export class DiscoveryError extends Error {
    code: DiscoveryErrorCode;
    chain: ChainId;
    cause?: unknown;

    constructor(message: string, opts: { code: DiscoveryErrorCode; chain: ChainId; cause?: unknown }) {
        super(message);
        this.name = 'DiscoveryError';
        this.code = opts.code;
        this.chain = opts.chain;
        this.cause = opts.cause;
    }
}

/**
 * One chain's on-chain package/contract/program discovery. Mirrors
 * ChainAdapter's shape (a small interface per chain, registered by ChainId)
 * rather than inventing a parallel architecture — discovery and execution
 * are separate concerns per chain, so this is its own interface rather than
 * bolted onto ChainAdapter.
 */
export interface ChainDiscoveryAdapter {
    readonly chain: ChainId;
    /** Whether this chain has a real discovery implementation right now. */
    readonly isSupported: boolean;

    /** Fetches every module in a package and its functions' full signatures in one call. */
    discoverPackage(identifier: string, network: Network): Promise<DiscoveredPackage>;
}
