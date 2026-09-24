/**
 * Raw shapes returned by Sui's `sui_getNormalizedMoveModulesByPackage` and
 * `sui_getNormalizedMoveFunction` JSON-RPC methods, verified live against a
 * real fullnode (0x2, the Sui framework package) rather than guessed from
 * docs. Only the fields this app's discovery layer actually reads are
 * typed — the real responses carry more (structs, friends, fileFormatVersion)
 * that isn't needed here.
 */

export type SuiMoveNormalizedType =
    | 'Address'
    | 'Bool'
    | 'U8'
    | 'U16'
    | 'U32'
    | 'U64'
    | 'U128'
    | 'U256'
    | 'Signer'
    | { TypeParameter: number }
    | { Reference: SuiMoveNormalizedType }
    | { MutableReference: SuiMoveNormalizedType }
    | { Vector: SuiMoveNormalizedType }
    | {
          Struct: {
              address: string;
              module: string;
              name: string;
              typeArguments: SuiMoveNormalizedType[];
          };
      };

export interface SuiMoveNormalizedFunction {
    visibility: 'Public' | 'Private' | 'Friend';
    isEntry: boolean;
    typeParameters: { abilities: string[] }[];
    parameters: SuiMoveNormalizedType[];
    return: SuiMoveNormalizedType[];
}

export interface SuiMoveNormalizedModule {
    fileFormatVersion: number;
    address: string;
    name: string;
    exposedFunctions: Record<string, SuiMoveNormalizedFunction>;
}

/** Result of `sui_getNormalizedMoveModulesByPackage`: every module in the package, keyed by name. */
export type SuiNormalizedModulesByPackage = Record<string, SuiMoveNormalizedModule>;
