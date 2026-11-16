/**
 * Soroban contract specs: load a deployed contract's interface, turn form
 * input into typed ScVal arguments, and decode results with the contract's
 * own types.
 *
 * Wasm contracts publish their spec in the `contractspecv0` section. Stellar
 * Asset Contracts are built into the network and have no Wasm, so they get
 * the built-in token interface below.
 */
import type { contract as ContractNs, xdr as XdrNs } from '@stellar/stellar-sdk';
import type { Network, StellarArg } from '@/types';
import { resolveChainRpcUrl } from '../suiService';

type Spec = ContractNs.Spec;
type TypeDef = XdrNs.ScSpecTypeDef;

export interface LoadedSpec {
    spec: Spec;
    /** 'wasm': read from the contract's Wasm. 'stellar-asset': the built-in Stellar Asset Contract interface. */
    source: 'wasm' | 'stellar-asset';
}

const loadSdk = () => import('@stellar/stellar-sdk');

/* -------------------------------------------------- Stellar Asset Contract */

type SacType = 'address' | 'i128' | 'u32' | 'bool' | 'string';
const SAC_FUNCTIONS: [name: string, inputs: [string, SacType][], output: SacType | null, doc: string][] = [
    ['allowance', [['from', 'address'], ['spender', 'address']], 'i128', 'Amount `spender` may still transfer from `from`.'],
    ['approve', [['from', 'address'], ['spender', 'address'], ['amount', 'i128'], ['expiration_ledger', 'u32']], null, 'Lets `spender` transfer up to `amount` from `from` until `expiration_ledger`.'],
    ['balance', [['id', 'address']], 'i128', 'Balance of `id`, in base units.'],
    ['transfer', [['from', 'address'], ['to', 'address'], ['amount', 'i128']], null, 'Moves `amount` from `from` to `to`.'],
    ['transfer_from', [['spender', 'address'], ['from', 'address'], ['to', 'address'], ['amount', 'i128']], null, 'Moves `amount` from `from` to `to` using an allowance.'],
    ['burn', [['from', 'address'], ['amount', 'i128']], null, 'Destroys `amount` held by `from`.'],
    ['burn_from', [['spender', 'address'], ['from', 'address'], ['amount', 'i128']], null, 'Destroys `amount` from `from` using an allowance.'],
    ['decimals', [], 'u32', 'Number of decimals (7 for Stellar assets).'],
    ['name', [], 'string', 'Asset name, "CODE:ISSUER" or "native".'],
    ['symbol', [], 'string', 'Asset code, or "native" for XLM.'],
    ['admin', [], 'address', 'Current admin (the issuer, unless changed).'],
    ['set_admin', [['new_admin', 'address']], null, 'Admin only: hands admin rights to `new_admin`.'],
    ['authorized', [['id', 'address']], 'bool', 'Whether `id` is authorized to hold the asset.'],
    ['set_authorized', [['id', 'address'], ['authorize', 'bool']], null, 'Admin only: authorizes or deauthorizes `id`.'],
    ['mint', [['to', 'address'], ['amount', 'i128']], null, 'Admin only: issues `amount` to `to`.'],
    ['clawback', [['from', 'address'], ['amount', 'i128']], null, 'Admin only: takes back `amount` from `from`, if the asset allows clawback.']
];

const stellarAssetSpec = async (): Promise<Spec> => {
    const { contract, xdr } = await loadSdk();
    const typeDef = (t: SacType): TypeDef =>
        ({
            address: xdr.ScSpecTypeDef.scSpecTypeAddress,
            i128: xdr.ScSpecTypeDef.scSpecTypeI128,
            u32: xdr.ScSpecTypeDef.scSpecTypeU32,
            bool: xdr.ScSpecTypeDef.scSpecTypeBool,
            string: xdr.ScSpecTypeDef.scSpecTypeString
        })[t]();
    return new contract.Spec(
        SAC_FUNCTIONS.map(([name, inputs, output, doc]) =>
            xdr.ScSpecEntry.scSpecEntryFunctionV0(
                new xdr.ScSpecFunctionV0({
                    doc,
                    name,
                    inputs: inputs.map(([n, t]) => new xdr.ScSpecFunctionInputV0({ doc: '', name: n, type: typeDef(t) })),
                    outputs: output ? [typeDef(output)] : []
                })
            )
        )
    );
};

/* ------------------------------------------------------------------ Loading */

export class SpecLoadError extends Error {
    constructor(
        message: string,
        readonly code: 'NOT_FOUND' | 'NO_SPEC',
        readonly cause?: unknown
    ) {
        super(message);
        this.name = 'SpecLoadError';
    }
}

const cache = new Map<string, Promise<LoadedSpec>>();

const fetchSpec = async (contractId: string, network: Network): Promise<LoadedSpec> => {
    const { rpc, contract, xdr } = await loadSdk();
    const server = new rpc.Server(resolveChainRpcUrl('stellar', network));
    // The instance entry says what runs the contract: uploaded Wasm or the built-in asset contract.
    let instance: XdrNs.ScContractInstance;
    try {
        const entry = await server.getContractData(contractId, xdr.ScVal.scvLedgerKeyContractInstance(), rpc.Durability.Persistent);
        instance = entry.val.contractData().val().instance();
    } catch (cause) {
        throw new SpecLoadError(`No contract found at ${contractId} on ${network}.`, 'NOT_FOUND', cause);
    }
    if (instance.executable().switch().name === 'contractExecutableStellarAsset') {
        return { spec: await stellarAssetSpec(), source: 'stellar-asset' };
    }
    let wasm: Buffer;
    try {
        wasm = await server.getContractWasmByContractId(contractId);
    } catch (cause) {
        throw new SpecLoadError(`Could not read the Wasm code of ${contractId} on ${network}.`, 'NOT_FOUND', cause);
    }
    try {
        return { spec: contract.Spec.fromWasm(wasm), source: 'wasm' };
    } catch (cause) {
        throw new SpecLoadError('This contract’s Wasm has no readable contract spec.', 'NO_SPEC', cause);
    }
};

/**
 * The spec for a contract, cached per network. `fresh` re-reads it, since
 * Soroban contracts can be upgraded in place.
 */
export const loadStellarSpec = (contractId: string, network: Network, { fresh = false } = {}): Promise<LoadedSpec> => {
    const key = `${network}:${contractId}`;
    const cached = cache.get(key);
    if (cached && !fresh) return cached;
    const pending = fetchSpec(contractId, network);
    cache.set(key, pending);
    pending.catch(() => cache.delete(key));
    return pending;
};

/** Test helper. */
export const clearStellarSpecCache = () => cache.clear();

/* ------------------------------------------------------------------ Types */

const kind = (t: TypeDef): string => t.switch().name.replace(/^scSpecType/, '').toLowerCase();

const INTEGER_KINDS = new Set(['u64', 'i64', 'u128', 'i128', 'u256', 'i256', 'timepoint', 'duration']);
const TEXT_KINDS = new Set(['address', 'muxedaddress', 'string', 'symbol', 'bool', 'u32', 'i32', 'bytes', 'bytesn', ...INTEGER_KINDS]);

/** True when a single line of text is enough for this type; the rest take JSON. */
export const isTextInput = (spec: Spec, t: TypeDef): boolean => {
    const k = kind(t);
    if (k === 'option') return isTextInput(spec, t.option().valueType());
    if (k === 'udt') {
        // An enum value is one case name or number.
        const entryKind = udtEntry(spec, t).switch().name;
        return entryKind === 'scSpecEntryUdtEnumV0' || entryKind === 'scSpecEntryUdtErrorEnumV0';
    }
    return TEXT_KINDS.has(k);
};

const udtEntry = (spec: Spec, t: TypeDef) => spec.findEntry(t.udt().name().toString());

/** A valid account address (all-zero key) for examples. */
const SAMPLE_ADDRESS = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

/** An example input for a type, as the form expects it (JSON for structured types). */
export const exampleValue = (spec: Spec, t: TypeDef, depth = 0): unknown => {
    if (depth > 4) return null;
    const k = kind(t);
    switch (k) {
        case 'option':
            return exampleValue(spec, t.option().valueType(), depth + 1);
        case 'bool':
            return true;
        case 'u32':
        case 'i32':
            return 1;
        case 'string':
            return 'text';
        case 'symbol':
            return 'name';
        case 'address':
        case 'muxedaddress':
            return SAMPLE_ADDRESS;
        case 'bytes':
            return '0x00';
        case 'bytesn':
            return `0x${'00'.repeat(t.bytesN().n())}`;
        case 'vec':
            return [exampleValue(spec, t.vec().elementType(), depth + 1)];
        case 'tuple':
            return t.tuple().valueTypes().map((v) => exampleValue(spec, v, depth + 1));
        case 'map': {
            const key = exampleValue(spec, t.map().keyType(), depth + 1);
            const val = exampleValue(spec, t.map().valueType(), depth + 1);
            return typeof key === 'string' ? { [key]: val } : [[key, val]];
        }
        case 'udt': {
            const entry = udtEntry(spec, t);
            switch (entry.switch().name) {
                case 'scSpecEntryUdtStructV0': {
                    const fields = entry.udtStructV0().fields();
                    if (fields.length && fields.every((f) => /^\d+$/.test(f.name().toString()))) {
                        return fields.map((f) => exampleValue(spec, f.type(), depth + 1));
                    }
                    return Object.fromEntries(fields.map((f) => [f.name().toString(), exampleValue(spec, f.type(), depth + 1)]));
                }
                case 'scSpecEntryUdtUnionV0': {
                    const first = entry.udtUnionV0().cases()[0];
                    if (!first) return null;
                    if (first.switch().name === 'scSpecUdtUnionCaseVoidV0') return first.voidCase().name().toString();
                    const tc = first.tupleCase();
                    return { tag: tc.name().toString(), values: tc.type().map((v) => exampleValue(spec, v, depth + 1)) };
                }
                case 'scSpecEntryUdtEnumV0':
                    return entry.udtEnumV0().cases()[0]?.name().toString() ?? 0;
                case 'scSpecEntryUdtErrorEnumV0':
                    return entry.udtErrorEnumV0().cases()[0]?.value() ?? 0;
                default:
                    return null;
            }
        }
        default:
            return INTEGER_KINDS.has(k) ? '1000' : null;
    }
};

/** Placeholder text for a form field of this type. */
export const placeholderFor = (spec: Spec, t: TypeDef): string => {
    const example = exampleValue(spec, t);
    const optional = kind(t) === 'option' ? ' (empty for none)' : '';
    if (isTextInput(spec, t)) {
        const inner = kind(t) === 'option' ? t.option().valueType() : t;
        const text = ['address', 'muxedaddress'].includes(kind(inner)) ? 'G… or C… address' : typeof example === 'string' ? example : JSON.stringify(example);
        return `${text}${optional}`;
    }
    return `${JSON.stringify(example, null, 2)}${optional ? `\n// empty for none` : ''}`;
};

/* --------------------------------------------------------- Input → native */

class InputError extends Error {}

const fail = (path: string, message: string): never => {
    throw new InputError(`${path}: ${message}`);
};

const toBigInt = (v: unknown, path: string, k: string): bigint => {
    if (typeof v === 'bigint') return v;
    if (typeof v === 'number') {
        if (!Number.isSafeInteger(v)) fail(path, `${v} is too large to write as a JSON number; put it in quotes.`);
        return BigInt(v);
    }
    if (typeof v === 'string' && /^-?\d+$/.test(v.trim())) return BigInt(v.trim());
    return fail(path, `expected a whole number for ${k}.`);
};

const toBytes = (v: unknown, path: string, size?: number): Uint8Array => {
    let bytes: Uint8Array;
    if (Array.isArray(v) && v.every((b) => Number.isInteger(b) && b >= 0 && b < 256)) {
        bytes = Uint8Array.from(v as number[]);
    } else if (typeof v === 'string') {
        const hex = v.trim().replace(/^0x/i, '');
        if (!/^[0-9a-fA-F]*$/.test(hex) || hex.length % 2) fail(path, 'expected hex bytes, e.g. 0xdeadbeef.');
        bytes = Uint8Array.from(hex.match(/../g)?.map((b) => parseInt(b, 16)) ?? []);
    } else {
        return fail(path, 'expected hex bytes, e.g. 0xdeadbeef.');
    }
    if (size !== undefined && bytes.length !== size) fail(path, `expected exactly ${size} bytes, got ${bytes.length}.`);
    return bytes;
};

/**
 * Coerces a parsed form value into the native shape `Spec.nativeToScVal`
 * accepts, checking it against the type on the way. Accepts friendlier forms
 * than the SDK does: numbers as strings, hex bytes, enum case names, and a
 * bare tag for a union case with no values.
 */
const toNative = (spec: Spec, t: TypeDef, v: unknown, path: string): unknown => {
    const k = kind(t);
    switch (k) {
        case 'option':
            return v === null || v === undefined || v === '' ? null : toNative(spec, t.option().valueType(), v, path);
        case 'void':
            return null;
        case 'val':
            return v;
        case 'bool':
            if (typeof v === 'boolean') return v;
            if (v === 'true' || v === 'false') return v === 'true';
            return fail(path, 'expected true or false.');
        case 'u32':
        case 'i32': {
            const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
            if (typeof n !== 'number' || !Number.isInteger(n)) return fail(path, `expected a whole number for ${k}.`);
            if (k === 'u32' ? n < 0 || n > 0xffffffff : n < -0x80000000 || n > 0x7fffffff) fail(path, `${n} is out of range for ${k}.`);
            return n;
        }
        case 'string':
        case 'symbol':
            if (typeof v !== 'string') return fail(path, `expected text for ${k}.`);
            return v;
        case 'address':
        case 'muxedaddress':
            if (typeof v !== 'string' || !/^[GCMLB][A-Z2-7]{55,68}$/.test(v.trim())) return fail(path, 'expected a G…, C… or M… address.');
            return v.trim();
        case 'bytes':
            return toBytes(v, path);
        case 'bytesn':
            return toBytes(v, path, t.bytesN().n());
        case 'vec':
            if (!Array.isArray(v)) return fail(path, 'expected a JSON array.');
            return v.map((item, i) => toNative(spec, t.vec().elementType(), item, `${path}[${i}]`));
        case 'tuple': {
            const types = t.tuple().valueTypes();
            if (!Array.isArray(v) || v.length !== types.length) return fail(path, `expected an array of ${types.length} values.`);
            return v.map((item, i) => toNative(spec, types[i], item, `${path}[${i}]`));
        }
        case 'map': {
            const keyType = t.map().keyType();
            const valType = t.map().valueType();
            const pairs: [unknown, unknown][] = Array.isArray(v)
                ? (v as unknown[]).map((pair, i) => (Array.isArray(pair) && pair.length === 2 ? (pair as [unknown, unknown]) : fail(`${path}[${i}]`, 'expected a [key, value] pair.')))
                : v && typeof v === 'object'
                  ? Object.entries(v)
                  : fail(path, 'expected a JSON object or an array of [key, value] pairs.');
            return pairs.map(([key, val]) => [toNative(spec, keyType, key, `${path} key`), toNative(spec, valType, val, `${path}.${String(key)}`)]);
        }
        case 'udt':
            return udtToNative(spec, t, v, path);
        default:
            if (INTEGER_KINDS.has(k)) return toBigInt(v, path, k);
            return fail(path, `type ${k} cannot be entered here.`);
    }
};

const udtToNative = (spec: Spec, t: TypeDef, v: unknown, path: string): unknown => {
    const name = t.udt().name().toString();
    const entry = udtEntry(spec, t);
    switch (entry.switch().name) {
        case 'scSpecEntryUdtStructV0': {
            const fields = entry.udtStructV0().fields();
            const positional = fields.length > 0 && fields.every((f) => /^\d+$/.test(f.name().toString()));
            if (positional) {
                if (!Array.isArray(v) || v.length !== fields.length) return fail(path, `${name} expects an array of ${fields.length} values.`);
                return fields.map((f, i) => toNative(spec, f.type(), v[i], `${path}[${i}]`));
            }
            if (!v || typeof v !== 'object' || Array.isArray(v)) return fail(path, `${name} expects a JSON object.`);
            const obj = v as Record<string, unknown>;
            const known = new Set(fields.map((f) => f.name().toString()));
            const extra = Object.keys(obj).filter((key) => !known.has(key));
            if (extra.length) fail(path, `${name} has no field ${extra.map((e) => `"${e}"`).join(', ')}.`);
            return Object.fromEntries(
                fields.map((f) => {
                    const field = f.name().toString();
                    const isOptional = kind(f.type()) === 'option';
                    if (!(field in obj) && !isOptional) fail(path, `${name} is missing field "${field}".`);
                    return [field, toNative(spec, f.type(), obj[field], `${path}.${field}`)];
                })
            );
        }
        case 'scSpecEntryUdtUnionV0': {
            const cases = entry.udtUnionV0().cases();
            const tag = typeof v === 'string' ? v : v && typeof v === 'object' ? (v as { tag?: unknown }).tag : undefined;
            const found = cases.find((c) => (c.switch().name === 'scSpecUdtUnionCaseVoidV0' ? c.voidCase() : c.tupleCase()).name().toString() === tag);
            const names = cases.map((c) => (c.switch().name === 'scSpecUdtUnionCaseVoidV0' ? c.voidCase() : c.tupleCase()).name().toString());
            if (!found) return fail(path, `${name} expects one of ${names.join(', ')}, as "Case" or {"tag": "Case", "values": […]}.`);
            if (found.switch().name === 'scSpecUdtUnionCaseVoidV0') return { tag };
            const types = found.tupleCase().type();
            const values = (v as { values?: unknown }).values;
            if (!Array.isArray(values) || values.length !== types.length) return fail(path, `${name}::${String(tag)} expects "values" with ${types.length} item(s).`);
            return { tag, values: values.map((item, i) => toNative(spec, types[i], item, `${path}.values[${i}]`)) };
        }
        case 'scSpecEntryUdtEnumV0':
        case 'scSpecEntryUdtErrorEnumV0': {
            const cases =
                entry.switch().name === 'scSpecEntryUdtEnumV0' ? entry.udtEnumV0().cases() : entry.udtErrorEnumV0().cases();
            const byName = cases.find((c) => c.name().toString() === v);
            if (byName) return byName.value();
            const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
            if (cases.some((c) => c.value() === n)) return n;
            return fail(path, `${name} expects one of ${cases.map((c) => `${c.name().toString()} (${c.value()})`).join(', ')}.`);
        }
        default:
            return fail(path, `type ${name} cannot be entered here.`);
    }
};

/** Parses one form field: plain text for simple types, JSON for structured ones. */
const parseField = (spec: Spec, t: TypeDef, raw: string, path: string): unknown => {
    const text = raw.trim();
    if (isTextInput(spec, t)) return text;
    if (text === '') return kind(t) === 'option' ? null : fail(path, 'enter a JSON value.');
    try {
        return JSON.parse(text);
    } catch {
        // A bare word is a union case without values, e.g. Market for "Market".
        if (/^[A-Za-z_]\w*$/.test(text)) return text;
        return fail(path, 'is not valid JSON.');
    }
};

/** Converts form arguments, in spec order, into the call's ScVal arguments. Throws with the argument path on bad input. */
export const specArgsToScVals = (spec: Spec, fnName: string, args: Pick<StellarArg, 'value'>[]): XdrNs.ScVal[] => {
    const fn = spec.getFunc(fnName);
    const inputs = fn.inputs();
    if (args.length !== inputs.length) throw new Error(`${fnName} takes ${inputs.length} argument(s), got ${args.length}.`);
    return inputs.map((input, i) => {
        const name = input.name().toString();
        const native = toNative(spec, input.type(), parseField(spec, input.type(), args[i].value, name), name);
        return spec.nativeToScVal(native, input.type());
    });
};

/** Checks one argument without building the call; returns the problem, or null. */
export const validateSpecArg = (spec: Spec, fnName: string, index: number, raw: string): string | null => {
    try {
        const input = spec.getFunc(fnName).inputs()[index];
        if (!input) return null;
        const name = input.name().toString();
        spec.nativeToScVal(toNative(spec, input.type(), parseField(spec, input.type(), raw, name), name), input.type());
        return null;
    } catch (error) {
        return error instanceof Error ? error.message : String(error);
    }
};

/** Decodes a call's return value with the contract's own types (struct fields, union tags, enum values). */
export const specResultToNative = (spec: Spec, fnName: string, retval: XdrNs.ScVal): unknown => {
    const value: unknown = spec.funcResToNative(fnName, retval);
    // A `result<T, E>` output comes back as the SDK's Ok/Err wrapper: show T itself, or the error.
    if (value && typeof value === 'object' && typeof (value as { isOk?: unknown }).isOk === 'function') {
        const r = value as { isOk(): boolean; value?: unknown; error?: unknown };
        return r.isOk() ? r.value : { error: r.error };
    }
    return value;
};

/**
 * Names a contract error from the spec: "Error(Contract, #3)" in a host
 * error becomes "InsufficientBalance (#3)". Undefined when the error is not
 * a contract error or the spec does not declare that code.
 */
export const describeContractError = (spec: Spec, message: string): string | undefined => {
    const match = /Error\(Contract, #(\d+)\)/.exec(message);
    if (!match) return undefined;
    const code = Number(match[1]);
    const found = spec.errorCases().find((c) => c.value() === code);
    if (!found) return undefined;
    const doc = found.doc().toString().trim();
    return `${found.name().toString()} (#${code})${doc ? `: ${doc}` : ''}`;
};
