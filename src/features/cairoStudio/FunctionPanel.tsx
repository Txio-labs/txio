import React, { useMemo, useState } from 'react';
import { BookOpen, Code2, Layers, Play } from 'lucide-react';
import { appStore, useAppStore } from '@/lib/store';
import { Badge, Button, Input, Textarea } from '@/components/ui/primitives';
import { Select } from '@/components/Select';
import { DEFAULT_MOVE_CALL } from '@/lib/constants';
import { withTxChain } from '@/services/transactionService';
import { shortType, type CairoEntryPoint, type ParsedAbi } from '@/services/cairo/abi';
import { exampleValue, isScalarType, describeType } from '@/services/cairo/values';
import { encodeCall, readCall, type BlockTag, type ReadCallResult } from '@/services/cairo/contract';
import { isStarknetAddress } from '@/services/starknet';
import { RequestType, type RequestItem } from '@/types';
import { ErrorNote, JsonBlock, ValueRow } from './shared';

const BLOCKS: { value: BlockTag; label: string }[] = [
    { value: 'latest', label: 'latest (L2 accepted)' },
    { value: 'pre_confirmed', label: 'pre_confirmed' },
    { value: 'l1_accepted', label: 'l1_accepted' },
];

const initialText = (type: string, abi: ParsedAbi) =>
    isScalarType(type, abi) ? '' : JSON.stringify(exampleValue(type, abi), null, 2);

const placeholderFor = (type: string, abi: ParsedAbi) => {
    switch (describeType(type, abi).kind) {
        case 'bool':
            return 'true or false';
        case 'address':
        case 'class_hash':
            return '0x…';
        case 'byte_array':
            return 'text';
        case 'felt':
            return 'number, 0x hex, or short text';
        default:
            return 'decimal or 0x hex';
    }
};

const errorText = (err: unknown) => (err instanceof Error && err.message ? err.message : 'Something went wrong.');

/**
 * One entry point: typed inputs, then a read call (view functions), the
 * encoded calldata, and hand-offs to the RPC editor and the transaction
 * builder. Nothing here signs: writes go through the transaction builder,
 * which simulates first and asks the wallet.
 *
 * Render it with a `key` per function: its inputs and results belong to one function.
 */
export const FunctionPanel: React.FC<{ abi: ParsedAbi; fn: CairoEntryPoint; address: string }> = ({ abi, fn, address }) => {
    const { network } = useAppStore();
    const [texts, setTexts] = useState<string[]>(() => fn.inputs.map((i) => initialText(i.type, abi)));
    const [block, setBlock] = useState<BlockTag>('latest');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [calldata, setCalldata] = useState<string[] | null>(null);
    const [result, setResult] = useState<ReadCallResult | null>(null);

    const addressOk = isStarknetAddress(address);
    const isView = fn.mutability === 'view';
    const signature = useMemo(
        () => `${fn.name}(${fn.inputs.map((i) => `${i.name}: ${shortType(i.type)}`).join(', ')})${fn.outputs.length ? ` -> ${fn.outputs.map((o) => shortType(o.type)).join(', ')}` : ''}`,
        [fn]
    );

    const run = async (action: () => Promise<void>) => {
        setBusy(true);
        setError(null);
        try {
            await action();
        } catch (err) {
            setError(errorText(err));
        } finally {
            setBusy(false);
        }
    };

    const encode = () => run(async () => setCalldata(await encodeCall(abi, fn, texts)));

    const call = () =>
        run(async () => {
            const res = await readCall(network, address, abi, fn, texts, block);
            setCalldata(res.calldata);
            setResult(res);
        });

    /** A starknet_call request with this call encoded, so it can be saved to a collection. */
    const openAsRequest = () =>
        run(async () => {
            const data = await encodeCall(abi, fn, texts);
            appStore.openTab('rpc', {
                id: `rpc-${Date.now()}`,
                name: `${fn.name} (starknet_call)`,
                type: RequestType.RPC,
                network,
                rpcParams: {
                    method: 'starknet_call',
                    params: [{ contract_address: address.trim(), entry_point_selector: fn.selector, calldata: data }, block],
                    chain: 'starknet',
                },
                moveParams: { ...DEFAULT_MOVE_CALL },
            } satisfies RequestItem);
        });

    /** A transaction request with this call, where it is simulated and then signed with the wallet. */
    const prepareTransaction = () =>
        run(async () => {
            // Encode first, so bad arguments are reported here rather than in the builder.
            await encodeCall(abi, fn, texts);
            const base: RequestItem = {
                id: `rpc-${Date.now()}`,
                name: `${fn.name} transaction`,
                type: RequestType.TRANSACTION,
                network,
                rpcParams: { method: '', params: [], chain: 'starknet' },
                moveParams: { ...DEFAULT_MOVE_CALL },
            };
            appStore.openTab('rpc', {
                ...withTxChain(base, 'starknet'),
                starknetTxParams: {
                    calls: [{ id: `${Date.now()}`, contractAddress: address.trim(), entrypoint: fn.name, args: texts }],
                },
            });
        });

    return (
        <div className="space-y-4">
            <div>
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-mono text-[15px] font-semibold text-fg">{fn.name}</h3>
                    <Badge tone={isView ? 'neutral' : 'warning'}>{isView ? 'view' : 'external'}</Badge>
                    {fn.kind !== 'function' && <Badge>{fn.kind}</Badge>}
                    {fn.interfaceName && <span className="text-xs text-fg-subtle">{shortType(fn.interfaceName)}</span>}
                </div>
                <p className="mt-1 break-all font-mono text-xs text-fg-muted">{signature}</p>
                <ValueRow label="Selector" value={fn.selector} />
            </div>

            {fn.inputs.length > 0 ? (
                <div className="space-y-3">
                    {fn.inputs.map((input, i) => {
                        const id = `arg-${fn.name}-${input.name}`;
                        const scalar = isScalarType(input.type, abi);
                        return (
                            <div key={input.name} className="flex flex-col gap-1.5">
                                <label htmlFor={id} className="flex items-baseline gap-2 text-xs">
                                    <span className="font-medium text-fg">{input.name}</span>
                                    <span className="font-mono text-fg-subtle">{shortType(input.type)}</span>
                                    {!scalar && <span className="text-fg-subtle">JSON</span>}
                                </label>
                                {scalar ? (
                                    <Input
                                        id={id}
                                        mono
                                        value={texts[i] ?? ''}
                                        placeholder={placeholderFor(input.type, abi)}
                                        onChange={(e) => setTexts((prev) => prev.map((t, j) => (j === i ? e.target.value : t)))}
                                    />
                                ) : (
                                    <Textarea
                                        id={id}
                                        mono
                                        rows={Math.min(10, Math.max(3, (texts[i] ?? '').split('\n').length))}
                                        value={texts[i] ?? ''}
                                        onChange={(e) => setTexts((prev) => prev.map((t, j) => (j === i ? e.target.value : t)))}
                                    />
                                )}
                            </div>
                        );
                    })}
                    <p className="text-[12px] text-fg-subtle">
                        Numbers take decimal or 0x hex. Structs are objects, arrays are lists, enums are {'{"Variant": value}'}, Option is{' '}
                        {'{"Some": value}'} or null.
                    </p>
                </div>
            ) : (
                <p className="text-xs text-fg-subtle">This function takes no arguments.</p>
            )}

            {fn.kind === 'function' && !addressOk && (
                <p className="text-xs text-amber-700 dark:text-amber-300">Enter the contract address above to call this function.</p>
            )}

            <div className="flex flex-wrap items-center gap-2">
                {isView && fn.kind === 'function' && (
                    <>
                        <div className="w-48">
                            <Select value={block} onChange={(v) => setBlock(v as BlockTag)} options={BLOCKS} size="sm" fullWidth ariaLabel="Block" />
                        </div>
                        <Button variant="primary" size="sm" icon={<Play size={13} />} onClick={() => void call()} loading={busy} disabled={!addressOk}>
                            Call
                        </Button>
                    </>
                )}
                {!isView && fn.kind === 'function' && (
                    <Button variant="primary" size="sm" icon={<Layers size={13} />} onClick={() => void prepareTransaction()} disabled={busy || !addressOk}>
                        Prepare transaction
                    </Button>
                )}
                <Button size="sm" icon={<Code2 size={13} />} onClick={() => void encode()} disabled={busy}>
                    Encode calldata
                </Button>
                {fn.kind === 'function' && (
                    <Button size="sm" variant="ghost" icon={<BookOpen size={13} />} onClick={() => void openAsRequest()} disabled={busy || !addressOk}>
                        Open as RPC request
                    </Button>
                )}
            </div>
            {!isView && fn.kind === 'function' && (
                <p className="text-[12px] text-fg-subtle">
                    Opens a transaction request with this call. It is simulated first, and only your wallet can sign and submit it.
                </p>
            )}

            {error && <ErrorNote message={error} />}

            {result && (
                <div className="space-y-2">
                    <p className="text-[12px] text-fg-subtle">
                        Read with starknet_call at <span className="font-mono">{String(result.block)}</span> in {result.durationMs} ms. Nothing was signed or submitted.
                    </p>
                    {result.decodeError ? (
                        <ErrorNote message={`The node answered, but the ABI could not decode it: ${result.decodeError}`} />
                    ) : (
                        <JsonBlock label="Decoded result" value={result.decoded} />
                    )}
                    <JsonBlock label="Raw result (felts)" value={result.result} />
                </div>
            )}
            {calldata && <JsonBlock label={`Calldata (${calldata.length} felts)`} value={calldata} />}
        </div>
    );
};
