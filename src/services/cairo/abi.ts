/**
 * A Cairo contract ABI as Cairo Studio shows it: every callable entry point
 * with its selector, plus the events, structs, enums and interfaces the
 * contract declares. Built from any of the shapes an ABI arrives in: the
 * array itself, the JSON string a Sierra class carries, a class object from
 * starknet_getClass/getClassAt, or a Scarb `*.contract_class.json` artifact.
 *
 * Encoding stays in starknet.js (CallData); this module only reads the ABI.
 */

export type CairoAbi = ReadonlyArray<Record<string, unknown>>;

export interface CairoParam {
    name: string;
    type: string;
}

export type EntryPointKind = 'function' | 'constructor' | 'l1_handler';

export interface CairoEntryPoint {
    kind: EntryPointKind;
    name: string;
    inputs: CairoParam[];
    outputs: CairoParam[];
    /** View functions are read with starknet_call; everything else needs a transaction. */
    mutability: 'view' | 'external';
    /** The interface the function is declared in, or "" for a top-level entry point. */
    interfaceName: string;
    /** sn_keccak of the name: the entry point selector on chain. */
    selector: string;
}

export interface CairoEventMember {
    name: string;
    type: string;
    /** Cairo 1: "key" members go to the event keys, "data" to data, "nested"/"flat" are enum event variants. */
    kind: string;
}

export interface CairoEvent {
    name: string;
    /** Struct events carry members; enum events (the contract's top Event enum) carry variants. */
    kind: 'struct' | 'enum' | 'cairo0';
    members: CairoEventMember[];
    /** sn_keccak of the short name: keys[0] of an emitted event. */
    selector: string;
}

export interface CairoStruct {
    name: string;
    members: CairoParam[];
}

export interface CairoEnum {
    name: string;
    variants: CairoParam[];
}

export interface ParsedAbi {
    /** 0 for Cairo 0 (legacy) ABIs, 1 for Cairo 1+ (Sierra) ABIs. */
    cairoVersion: 0 | 1;
    entryPoints: CairoEntryPoint[];
    events: CairoEvent[];
    structs: CairoStruct[];
    enums: CairoEnum[];
    interfaces: { name: string; functions: string[] }[];
    impls: { name: string; interfaceName: string }[];
    /** The ABI array, as starknet.js CallData takes it. */
    raw: CairoAbi;
}

export class AbiParseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AbiParseError';
    }
}

/** Short display form of a Cairo type path: "core::integer::u256" becomes "u256". */
export const shortType = (type: string): string => type.replace(/\b(?:[a-z_][a-z0-9_]*::)+/g, '');

/** Last path segment of a name: "openzeppelin::...::Transfer" becomes "Transfer". */
export const shortName = (name: string): string => name.split('::').pop() ?? name;

const asParams = (value: unknown): CairoParam[] =>
    Array.isArray(value) ? value.map((p) => ({ name: String((p as CairoParam).name ?? ''), type: String((p as CairoParam).type ?? '') })) : [];

/**
 * Finds the ABI array inside whatever the user gave: an array, a JSON string
 * of one, or an object with an `abi` field (a class or a Scarb artifact) that
 * holds either.
 */
export const extractAbi = (input: unknown): CairoAbi => {
    let value = input;
    if (typeof value === 'string') {
        const text = value.trim();
        if (!text) throw new AbiParseError('Paste an ABI, or a contract class that contains one.');
        try {
            value = JSON.parse(text);
        } catch {
            throw new AbiParseError('This is not valid JSON.');
        }
    }
    if (value && typeof value === 'object' && !Array.isArray(value) && 'abi' in value) {
        value = (value as { abi: unknown }).abi;
        if (typeof value === 'string') {
            try {
                value = JSON.parse(value);
            } catch {
                throw new AbiParseError('The class has an "abi" field, but it is not valid JSON.');
            }
        }
    }
    if (!Array.isArray(value)) {
        throw new AbiParseError('Expected an ABI array, or an object with an "abi" field (a contract class or a Scarb contract_class.json).');
    }
    if (value.length === 0) throw new AbiParseError('The ABI is empty.');
    const bad = value.findIndex((item) => !item || typeof item !== 'object' || typeof (item as { type?: unknown }).type !== 'string');
    if (bad !== -1) throw new AbiParseError(`ABI item ${bad} has no "type" field.`);
    return value as CairoAbi;
};

/**
 * Parses an ABI. `selectorOf` is starknet.js `hash.getSelectorFromName`,
 * passed in so this module stays synchronous and free of the SDK import.
 */
export const parseAbi = (input: unknown, selectorOf: (name: string) => string): ParsedAbi => {
    const raw = extractAbi(input);
    // Cairo 1 ABIs declare their types (struct/enum/interface items, or `core::` paths); Cairo 0 ABIs use felt and bare names.
    const cairoVersion: 0 | 1 = raw.some(
        (i) => i.type === 'interface' || i.type === 'impl' || i.type === 'enum' || JSON.stringify(i).includes('core::')
    )
        ? 1
        : 0;

    const entryPoints: CairoEntryPoint[] = [];
    const interfaces: ParsedAbi['interfaces'] = [];
    const addFunction = (item: Record<string, unknown>, interfaceName: string) => {
        const kind = item.type as EntryPointKind;
        if (kind !== 'function' && kind !== 'constructor' && kind !== 'l1_handler') return;
        const name = String(item.name);
        const view = item.state_mutability === 'view' || item.stateMutability === 'view';
        entryPoints.push({
            kind,
            name,
            inputs: asParams(item.inputs),
            outputs: asParams(item.outputs),
            mutability: kind === 'function' && view ? 'view' : 'external',
            interfaceName,
            selector: kind === 'constructor' ? selectorOf('constructor') : selectorOf(name),
        });
    };

    const events: CairoEvent[] = [];
    const structs: CairoStruct[] = [];
    const enums: CairoEnum[] = [];
    const impls: ParsedAbi['impls'] = [];

    for (const item of raw) {
        switch (item.type) {
            case 'interface': {
                const items = Array.isArray(item.items) ? (item.items as Record<string, unknown>[]) : [];
                interfaces.push({ name: String(item.name), functions: items.filter((i) => i.type === 'function').map((i) => String(i.name)) });
                for (const inner of items) addFunction(inner, String(item.name));
                break;
            }
            case 'function':
            case 'constructor':
            case 'l1_handler':
                addFunction(item, '');
                break;
            case 'impl':
                impls.push({ name: String(item.name), interfaceName: String(item.interface_name ?? '') });
                break;
            case 'struct':
                structs.push({ name: String(item.name), members: asParams(item.members) });
                break;
            case 'enum':
                enums.push({ name: String(item.name), variants: asParams(item.variants) });
                break;
            case 'event': {
                const name = String(item.name);
                if (item.kind === 'struct' || item.kind === 'enum') {
                    const list = (item.kind === 'struct' ? item.members : item.variants) as CairoEventMember[] | undefined;
                    events.push({
                        name,
                        kind: item.kind,
                        members: (list ?? []).map((m) => ({ name: String(m.name), type: String(m.type), kind: String(m.kind ?? '') })),
                        selector: selectorOf(shortName(name)),
                    });
                } else {
                    // Cairo 0 events: keys and data lists.
                    const keys = asParams(item.keys).map((m) => ({ ...m, kind: 'key' }));
                    const data = asParams(item.data).map((m) => ({ ...m, kind: 'data' }));
                    events.push({ name, kind: 'cairo0', members: [...keys, ...data], selector: selectorOf(name) });
                }
                break;
            }
            default:
                break;
        }
    }

    if (entryPoints.length === 0 && events.length === 0 && structs.length === 0) {
        throw new AbiParseError('The ABI has no functions, events or types.');
    }

    return { cairoVersion, entryPoints, events, structs, enums, interfaces, impls, raw };
};

/** Functions that can be called by a user: view and external functions, not the constructor or L1 handlers. */
export const callableFunctions = (abi: ParsedAbi): CairoEntryPoint[] => abi.entryPoints.filter((e) => e.kind === 'function');
