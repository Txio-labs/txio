/**
 * Stellar XDR → readable JSON.
 *
 * Every Soroban RPC answer that matters for debugging (transaction envelopes,
 * results, meta, diagnostic events, ledger entries, auth entries) arrives as
 * base64 XDR. These helpers turn it into plain JSON a developer can read:
 * addresses as G…/C… strkeys, contract values (ScVal) as native values,
 * 64-bit integers as decimal strings, hashes as hex.
 *
 * The SDK is passed in rather than imported so callers keep loading it lazily
 * (it is large), and so tests can hand in the real module directly.
 */
type StellarSdk = typeof import('@stellar/stellar-sdk');

/** XDR types the inspector can decode, most specific first (used for auto-detection). */
export const STELLAR_XDR_TYPES = [
    'TransactionEnvelope',
    'TransactionMeta',
    'TransactionResult',
    'LedgerEntry',
    'LedgerKey',
    'SorobanTransactionData',
    'SorobanAuthorizationEntry',
    'DiagnosticEvent',
    'ContractEvent',
    'LedgerEntryData',
    'ScVal'
] as const;

export type StellarXdrType = (typeof STELLAR_XDR_TYPES)[number];

const MAX_DEPTH = 64;

/** Byte arrays, including Buffers from another realm (where `instanceof Uint8Array` is false). */
const isBytes = (v: unknown): v is Uint8Array =>
    ArrayBuffer.isView(v) && (v as Uint8Array).BYTES_PER_ELEMENT === 1 && typeof (v as Uint8Array).every === 'function';

const isPrintable = (bytes: Uint8Array) => bytes.length > 0 && bytes.every((b) => b >= 0x20 && b <= 0x7e);

const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

/** Plain JS value (from scValToNative) → JSON-safe value. */
const normalizeNative = (value: unknown, depth = 0): unknown => {
    if (depth > MAX_DEPTH) return '…';
    if (typeof value === 'bigint') return value.toString();
    if (isBytes(value)) return `0x${toHex(value)}`;
    if (Array.isArray(value)) return value.map((v) => normalizeNative(v, depth + 1));
    if (value instanceof Map) {
        return Object.fromEntries(Array.from(value, ([k, v]) => [String(normalizeNative(k, depth + 1)), normalizeNative(v, depth + 1)]));
    }
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalizeNative(v, depth + 1)]));
    }
    return value ?? null;
};

/** A contract value (ScVal) as a native JSON value, or its structural form if conversion fails. */
const scValToJson = (sdk: StellarSdk, scVal: unknown, depth: number): unknown => {
    // Ledger-key-only values have no native form (scValToNative gives undefined).
    if (isUnion(scVal)) {
        const kind = scVal.switch();
        const name = typeof kind === 'number' ? null : kind.name;
        if (name === 'scvLedgerKeyContractInstance') return 'ContractInstance';
        if (name === 'scvLedgerKeyNonce') return { nonce: structural(sdk, scVal.value(), depth + 1) };
    }
    try {
        return normalizeNative(sdk.scValToNative(scVal as never), depth);
    } catch {
        return structural(sdk, scVal, depth, false);
    }
};

interface XdrUnion {
    // An enum member for most unions; a plain integer for versioned ones (`ext`).
    switch(): { name: string } | number;
    arm(): string | undefined;
    value(): unknown;
}

const isUnion = (v: unknown): v is XdrUnion =>
    !!v && typeof (v as XdrUnion).switch === 'function' && typeof (v as XdrUnion).arm === 'function';

/**
 * Walks any js-xdr value. Class names are not used for detection because the
 * production bundle minifies them; only the structural API is relied on.
 */
const structural = (sdk: StellarSdk, value: unknown, depth: number, scValAware = true): unknown => {
    if (depth > MAX_DEPTH) return '…';
    if (value === undefined || value === null) return null;
    if (typeof value === 'bigint') return value.toString();
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
    if (isBytes(value)) return isPrintable(value) ? new TextDecoder().decode(value) : toHex(value);
    if (Array.isArray(value)) return value.map((v) => structural(sdk, v, depth + 1));

    const obj = value as Record<string, unknown>;

    // Hyper / UnsignedHyper (64-bit integers).
    if (typeof obj.toBigInt === 'function') return (obj.toBigInt as () => bigint)().toString();

    if (isUnion(value)) {
        const sw = value.switch();
        const kind = typeof sw === 'number' ? `v${sw}` : sw.name;
        const arm = value.arm();
        const inner = arm === undefined ? undefined : value.value();

        if (scValAware && kind.startsWith('scv')) return scValToJson(sdk, value, depth);

        // Account and contract identities as strkeys.
        if ((kind === 'publicKeyTypeEd25519' || kind === 'keyTypeEd25519') && isBytes(inner) && inner.length === 32) {
            return sdk.StrKey.encodeEd25519PublicKey(Buffer.from(inner));
        }
        if (kind === 'scAddressTypeContract' && isBytes(inner) && inner.length === 32) {
            return sdk.StrKey.encodeContract(Buffer.from(inner));
        }
        if (kind === 'scAddressTypeAccount') return structural(sdk, inner, depth + 1);

        if (inner === undefined) return kind;
        const walked = structural(sdk, inner, depth + 1);
        return walked && typeof walked === 'object' && !Array.isArray(walked)
            ? { type: kind, ...(walked as Record<string, unknown>) }
            : { type: kind, [arm ?? 'value']: walked };
    }

    // Struct.
    const attributes = obj._attributes as Record<string, unknown> | undefined;
    if (attributes && typeof attributes === 'object') {
        return Object.fromEntries(Object.entries(attributes).map(([k, v]) => [k, structural(sdk, v, depth + 1)]));
    }

    // Enum.
    if (typeof obj.name === 'string' && typeof obj.value === 'number') return obj.name;

    return String(value);
};

/** Any decoded XDR value → readable JSON. */
export const xdrToJson = (sdk: StellarSdk, value: unknown): unknown => structural(sdk, value, 0);

const parse = (sdk: StellarSdk, type: StellarXdrType, base64: string): unknown =>
    (sdk.xdr[type] as unknown as { fromXDR(input: string, format: 'base64'): unknown }).fromXDR(base64.trim(), 'base64');

/** Decodes base64 XDR as a given type. Throws when it is not that type. */
export const decodeStellarXdr = (sdk: StellarSdk, type: StellarXdrType, base64: string): unknown =>
    xdrToJson(sdk, parse(sdk, type, base64));

/**
 * The first type (most specific first) that parses the whole input, or null.
 * js-xdr rejects input with bytes left over, which keeps false matches rare.
 */
export const detectStellarXdrType = (sdk: StellarSdk, base64: string): StellarXdrType | null => {
    for (const type of STELLAR_XDR_TYPES) {
        try {
            parse(sdk, type, base64);
            return type;
        } catch {
            /* not this type */
        }
    }
    return null;
};

/**
 * RPC result keys that hold XDR, and their type. `xdr` and `value` depend on
 * where they appear, so they are resolved from their siblings below.
 */
const KEYED_TYPES: Record<string, StellarXdrType> = {
    envelopeXdr: 'TransactionEnvelope',
    resultXdr: 'TransactionResult',
    errorResultXdr: 'TransactionResult',
    resultMetaXdr: 'TransactionMeta',
    diagnosticEventsXdr: 'DiagnosticEvent',
    contractEventsXdr: 'ContractEvent',
    transactionData: 'SorobanTransactionData',
    auth: 'SorobanAuthorizationEntry',
    key: 'LedgerKey',
    before: 'LedgerEntry',
    after: 'LedgerEntry',
    topic: 'ScVal'
};

const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

const looksLikeXdr = (v: unknown): v is string => typeof v === 'string' && v.length >= 8 && v.length % 4 === 0 && BASE64_RE.test(v);

const typeFor = (key: string, siblings: Record<string, unknown>): StellarXdrType | null => {
    if (KEYED_TYPES[key]) return KEYED_TYPES[key];
    // getLedgerEntries: { key, xdr } → entry data. simulateTransaction results: { auth, xdr } → return value.
    if (key === 'xdr') return 'key' in siblings ? 'LedgerEntryData' : 'ScVal';
    // getEvents: { topic: [...], value } → event value.
    if (key === 'value' && 'topic' in siblings) return 'ScVal';
    // simulateTransaction: events is a list of base64 diagnostic events.
    if (key === 'events') return 'DiagnosticEvent';
    return null;
};

/**
 * Decodes every XDR field in a Soroban RPC result in place of its base64.
 * Returns null when the result carries no XDR (nothing worth a decoded view).
 */
export const decodeStellarRpcResult = (sdk: StellarSdk, result: unknown): unknown | null => {
    let decodedCount = 0;

    const decodeOne = (type: StellarXdrType, raw: string): unknown => {
        try {
            const decoded = decodeStellarXdr(sdk, type, raw);
            decodedCount++;
            return decoded;
        } catch {
            return raw;
        }
    };

    const walk = (node: unknown, depth: number): unknown => {
        if (depth > MAX_DEPTH) return node;
        if (Array.isArray(node)) return node.map((n) => walk(n, depth + 1));
        if (!node || typeof node !== 'object') return node;
        const siblings = node as Record<string, unknown>;
        return Object.fromEntries(
            Object.entries(siblings).map(([key, value]) => {
                const type = typeFor(key, siblings);
                if (type && looksLikeXdr(value)) return [key, decodeOne(type, value)];
                if (type && Array.isArray(value) && value.length > 0 && value.every(looksLikeXdr)) {
                    return [key, value.map((v) => decodeOne(type, v))];
                }
                return [key, walk(value, depth + 1)];
            })
        );
    };

    const decoded = walk(result, 0);
    return decodedCount > 0 ? decoded : null;
};

export interface StellarOperationSummary {
    type: string;
    source?: string;
    /** For contract calls. */
    contract?: string;
    function?: string;
    args?: unknown[];
    /** Every other operation field, in readable form. */
    details?: unknown;
}

export interface StellarTransactionSummary {
    hash: string;
    kind: 'transaction' | 'fee-bump';
    source: string;
    fee: string;
    sequence?: string;
    memo?: unknown;
    signatures: number;
    operations: StellarOperationSummary[];
    /** Present for fee-bump envelopes. */
    innerHash?: string;
}

/**
 * A human summary of a transaction envelope: who sends it, what it costs and
 * what each operation does. Contract calls are spelled out as contract,
 * function and native arguments.
 */
export const summarizeStellarEnvelope = (sdk: StellarSdk, base64: string, networkPassphrase: string): StellarTransactionSummary => {
    const parsed = sdk.TransactionBuilder.fromXDR(base64.trim(), networkPassphrase);
    const isFeeBump = parsed instanceof sdk.FeeBumpTransaction;
    const inner = isFeeBump ? (parsed as InstanceType<StellarSdk['FeeBumpTransaction']>).innerTransaction : (parsed as InstanceType<StellarSdk['Transaction']>);

    const operations: StellarOperationSummary[] = inner.tx.operations().map((op) => {
        const body = op.body();
        const type = body.switch().name as string;
        const source = op.sourceAccount() ? String(structural(sdk, op.sourceAccount(), 0)) : undefined;
        if (type === 'invokeHostFunction') {
            const fn = body.invokeHostFunctionOp().hostFunction();
            if (fn.switch().name === 'hostFunctionTypeInvokeContract') {
                const call = fn.invokeContract();
                return {
                    type,
                    ...(source ? { source } : {}),
                    contract: String(structural(sdk, call.contractAddress(), 0)),
                    function: call.functionName().toString(),
                    args: call.args().map((a) => scValToJson(sdk, a, 0))
                };
            }
        }
        return { type, ...(source ? { source } : {}), details: structural(sdk, body.value(), 0) };
    });

    return {
        hash: parsed.hash().toString('hex'),
        kind: isFeeBump ? 'fee-bump' : 'transaction',
        source: isFeeBump ? (parsed as InstanceType<StellarSdk['FeeBumpTransaction']>).feeSource : inner.source,
        fee: parsed.fee,
        ...(isFeeBump ? { innerHash: inner.hash().toString('hex') } : { sequence: inner.sequence }),
        memo:
            inner.memo.type === 'none'
                ? undefined
                : inner.memo.type === 'text' && isBytes(inner.memo.value)
                  ? new TextDecoder().decode(inner.memo.value)
                  : normalizeNative(inner.memo.value),
        signatures: parsed.signatures.length,
        operations
    };
};

// ── Simulation debugger ──────────────────────────────────────────────────────
// Readable forms of what `simulateTransaction` reports. Inputs are the SDK's
// parsed XDR objects; outputs are plain JSON.

type Xdr = StellarSdk['xdr'];

export interface SorobanEventSummary {
    /** contract | system | diagnostic */
    type: string;
    contract: string | null;
    topics: unknown[];
    data: unknown;
    /** False for events from a call that later failed (they would not be emitted on-chain). */
    inSuccessfulContractCall: boolean;
}

export const summarizeDiagnosticEvent = (sdk: StellarSdk, diagnostic: InstanceType<Xdr['DiagnosticEvent']>): SorobanEventSummary => {
    const event = diagnostic.event();
    const id = event.contractId();
    const body = event.body().v0();
    return {
        type: event.type().name,
        contract: id ? sdk.StrKey.encodeContract(Buffer.from(id as unknown as Uint8Array)) : null,
        topics: body.topics().map((t) => scValToJson(sdk, t, 0)),
        data: scValToJson(sdk, body.data(), 0),
        inSuccessfulContractCall: diagnostic.inSuccessfulContractCall()
    };
};

export interface SorobanInvocationNode {
    /** For contract calls. */
    contract?: string;
    function?: string;
    args?: unknown[];
    /** For anything else (contract creation): its kind and fields. */
    type?: string;
    details?: unknown;
    calls: SorobanInvocationNode[];
}

const invocationNode = (sdk: StellarSdk, invocation: InstanceType<Xdr['SorobanAuthorizedInvocation']>): SorobanInvocationNode => {
    const fn = invocation.function();
    const calls = invocation.subInvocations().map((sub) => invocationNode(sdk, sub));
    if (fn.switch().name === 'sorobanAuthorizedFunctionTypeContractFn') {
        const call = fn.contractFn();
        return {
            contract: String(structural(sdk, call.contractAddress(), 0)),
            function: call.functionName().toString(),
            args: call.args().map((a) => scValToJson(sdk, a, 0)),
            calls
        };
    }
    return { type: fn.switch().name, details: structural(sdk, fn.value(), 0), calls };
};

export interface SorobanAuthSummary {
    /** Who must sign: "source account", or the address that signs its own entry. */
    signer: string;
    invocation: SorobanInvocationNode;
}

export const summarizeAuthEntry = (sdk: StellarSdk, entry: InstanceType<Xdr['SorobanAuthorizationEntry']>): SorobanAuthSummary => {
    const credentials = entry.credentials();
    return {
        signer:
            credentials.switch().name === 'sorobanCredentialsAddress'
                ? String(structural(sdk, credentials.address().address(), 0))
                : 'source account',
        invocation: invocationNode(sdk, entry.rootInvocation())
    };
};

export interface SorobanResourceSummary {
    instructions: number;
    diskReadBytes: number;
    writeBytes: number;
    /** Stroops. */
    resourceFee: string;
    footprint: { readOnly: unknown[]; readWrite: unknown[] };
}

export const summarizeSorobanData = (sdk: StellarSdk, data: InstanceType<Xdr['SorobanTransactionData']>): SorobanResourceSummary => {
    const resources = data.resources();
    const footprint = resources.footprint();
    // Protocol 23 renamed readBytes to diskReadBytes.
    const r = resources as unknown as { diskReadBytes?: () => number; readBytes?: () => number };
    return {
        instructions: resources.instructions(),
        diskReadBytes: r.diskReadBytes?.() ?? r.readBytes?.() ?? 0,
        writeBytes: resources.writeBytes(),
        resourceFee: data.resourceFee().toString(),
        footprint: {
            readOnly: footprint.readOnly().map((k) => structural(sdk, k, 0)),
            readWrite: footprint.readWrite().map((k) => structural(sdk, k, 0))
        }
    };
};

export interface SorobanStateChange {
    type: string;
    key: unknown;
    before: unknown;
    after: unknown;
}

const CHANGE_TYPES: Record<number, string> = { 1: 'created', 2: 'updated', 3: 'deleted' };

export const summarizeStateChange = (
    sdk: StellarSdk,
    change: { type: number | string; key: unknown; before: unknown; after: unknown }
): SorobanStateChange => ({
    type: typeof change.type === 'number' ? (CHANGE_TYPES[change.type] ?? String(change.type)) : change.type,
    key: structural(sdk, change.key, 0),
    before: change.before ? structural(sdk, change.before, 0) : null,
    after: change.after ? structural(sdk, change.after, 0) : null
});

const short = (s: string) => (s.length > 14 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s);
const brief = (v: unknown): string => {
    const text = typeof v === 'string' ? v : JSON.stringify(v);
    return /^[GCM][A-Z2-7]{55}$/.test(text) ? short(text) : text.length > 48 ? `${text.slice(0, 45)}…` : text;
};

/** One line per event for review screens: "CDLZFC…CYSC transfer, GA…, GB… → 7". */
export const describeSorobanEvent = (e: SorobanEventSummary): string =>
    `${e.contract ? short(e.contract) : e.type} ${e.topics.map(brief).join(', ')} → ${brief(e.data)}`;

/** One line per ledger key: "contract data CDLZFC…CYSC Balance(GA…) (persistent)". */
export const describeLedgerKey = (key: unknown): string => {
    const k = key as Record<string, unknown> | null;
    if (!k || typeof k !== 'object') return String(key);
    switch (k.type) {
        case 'contractData':
            return `contract data ${short(String(k.contract))} ${brief(k.key)}${k.durability ? ` (${String(k.durability)})` : ''}`;
        case 'contractCode':
            return `contract code ${short(String(k.hash))}`;
        case 'account':
            return `account ${short(String(k.accountId))}`;
        case 'trustline':
            return `trustline ${short(String(k.accountId))} ${brief(k.asset)}`;
        default:
            return `${String(k.type)} ${brief(k)}`;
    }
};
