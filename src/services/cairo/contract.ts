/**
 * Cairo contract interaction for Cairo Studio and the transaction builder:
 * load an ABI from the chain, encode a call, run a read call and decode what
 * it returns. Encoding and decoding go through starknet.js CallData; values
 * are converted by ./values so errors name the field.
 */
import type { Network } from '@/types';
import { getStarknetProvider, loadStarknet } from '../starknet';
import { parseAbi, type CairoEntryPoint, type ParsedAbi } from './abi';
import { argFromText, CairoValueError, fromDecoded, toCallValue } from './values';

export type BlockTag = 'latest' | 'pre_confirmed' | 'l1_accepted';
export type BlockRef = BlockTag | number;

export interface LoadedClass {
    abi: ParsedAbi;
    classHash: string | null;
    /** Sierra contract class version ("0.1.0"), or null for a Cairo 0 class. */
    contractClassVersion: string | null;
    source: { kind: 'address' | 'class_hash'; value: string; network: Network };
}

const selectorOfSync = async () => (await loadStarknet()).hash.getSelectorFromName;

/** Parses an ABI from pasted text, an uploaded file's text or a class object. */
export const parseAbiInput = async (input: unknown): Promise<ParsedAbi> => parseAbi(input, await selectorOfSync());

/** The class and ABI of the contract deployed at `address`. */
export const loadClassAt = async (network: Network, address: string): Promise<LoadedClass> => {
    const provider = await getStarknetProvider(network);
    const [cls, classHash] = await Promise.all([
        provider.getClassAt(address.trim()) as Promise<Record<string, unknown>>,
        provider.getClassHashAt(address.trim()),
    ]);
    return {
        abi: await parseAbiInput(cls),
        classHash,
        contractClassVersion: typeof cls.contract_class_version === 'string' ? cls.contract_class_version : null,
        source: { kind: 'address', value: address.trim(), network },
    };
};

/** A declared class and its ABI, by class hash. */
export const loadClassByHash = async (network: Network, classHash: string): Promise<LoadedClass> => {
    const provider = await getStarknetProvider(network);
    const cls = (await provider.getClass(classHash.trim())) as Record<string, unknown>;
    return {
        abi: await parseAbiInput(cls),
        classHash: classHash.trim(),
        contractClassVersion: typeof cls.contract_class_version === 'string' ? cls.contract_class_version : null,
        source: { kind: 'class_hash', value: classHash.trim(), network },
    };
};

const toHex = (felt: string | bigint) => `0x${BigInt(felt).toString(16)}`;

/**
 * Encodes a call's arguments, given as the user typed them (one string per
 * input). Throws CairoValueError naming the argument on bad input.
 */
export const encodeCall = async (abi: ParsedAbi, fn: CairoEntryPoint, texts: string[]): Promise<string[]> => {
    if (texts.length !== fn.inputs.length) {
        throw new CairoValueError(fn.name, `${fn.inputs.length} arguments`, `got ${texts.length}`);
    }
    const sdk = await loadStarknet();
    const args: Record<string, unknown> = {};
    fn.inputs.forEach((input, i) => {
        args[input.name] = toCallValue(input.type, argFromText(input.type, texts[i] ?? '', abi, input.name), abi, sdk, input.name);
    });
    const compiled = new sdk.CallData(abi.raw as never).compile(fn.kind === 'constructor' ? 'constructor' : fn.name, args as never);
    return compiled.map(toHex);
};

/** Decodes a function's raw result felts into readable JSON, one entry per output. */
export const decodeResult = async (abi: ParsedAbi, fn: CairoEntryPoint, result: string[]): Promise<unknown> => {
    const { CallData } = await loadStarknet();
    const parsed = new CallData(abi.raw as never).parse(fn.name, result) as unknown;
    if (fn.outputs.length === 0) return null;
    // Cairo 1 functions return one value (a tuple for several); Cairo 0 names each output.
    if (abi.cairoVersion === 1 && fn.outputs.length === 1) return fromDecoded(fn.outputs[0].type, parsed, abi);
    const obj = parsed as Record<string, unknown>;
    return Object.fromEntries(fn.outputs.map((o, i) => [o.name || String(i), fromDecoded(o.type, obj[o.name] ?? obj[i], abi)]));
};

export interface ReadCallResult {
    calldata: string[];
    /** The felts starknet_call returned, as hex. */
    result: string[];
    /** The result decoded with the ABI; null when decoding failed (see decodeError). */
    decoded: unknown;
    decodeError: string | null;
    block: BlockRef;
    durationMs: number;
}

/** Runs a view function with starknet_call. Nothing is signed or submitted. */
export const readCall = async (
    network: Network,
    address: string,
    abi: ParsedAbi,
    fn: CairoEntryPoint,
    texts: string[],
    block: BlockRef = 'latest'
): Promise<ReadCallResult> => {
    const calldata = await encodeCall(abi, fn, texts);
    const provider = await getStarknetProvider(network);
    const start = performance.now();
    const raw = await provider.callContract({ contractAddress: address.trim(), entrypoint: fn.name, calldata }, block);
    const durationMs = Math.round(performance.now() - start);
    const result = (raw as string[]).map(toHex);
    try {
        return { calldata, result, decoded: await decodeResult(abi, fn, result), decodeError: null, block, durationMs };
    } catch (err) {
        return { calldata, result, decoded: null, decodeError: err instanceof Error ? err.message : 'Could not decode the result.', block, durationMs };
    }
};
