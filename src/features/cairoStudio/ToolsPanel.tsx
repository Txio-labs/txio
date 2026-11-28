import React, { useEffect, useState } from 'react';
import type * as Starknet from 'starknet';
import { Card, Input, Textarea } from '@/components/ui/primitives';
import { loadStarknet } from '@/services/starknet';
import { checkAddress, convertFelt, decodeByteArray, encodeByteArray, joinU256, selectorOf, splitU256 } from '@/services/cairo/tools';
import { ErrorNote, ValueRow } from './shared';

type Sdk = typeof Starknet;

/** Runs `fn` on every change of `input`; shows its rows or its error. Empty input shows nothing. */
function runTool<T>(sdk: Sdk | null, input: string, fn: (sdk: Sdk, input: string) => T): { value: T | null; error: string | null } {
    if (!sdk || !input.trim()) return { value: null, error: null };
    try {
        return { value: fn(sdk, input), error: null };
    } catch (err) {
        return { value: null, error: err instanceof Error ? err.message : 'Invalid input.' };
    }
}

function Tool({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
    return (
        <Card className="space-y-2 p-4">
            <div>
                <h3 className="text-[14px] font-semibold text-fg">{title}</h3>
                <p className="text-xs text-fg-subtle">{description}</p>
            </div>
            {children}
        </Card>
    );
}

/** Converters for the values Cairo developers handle by hand. All conversions run in the browser through starknet.js. */
export const ToolsPanel: React.FC = () => {
    const [sdk, setSdk] = useState<Sdk | null>(null);
    useEffect(() => {
        void loadStarknet().then(setSdk);
    }, []);

    const [name, setName] = useState('');
    const [felt, setFelt] = useState('');
    const [u256, setU256] = useState('');
    const [low, setLow] = useState('');
    const [high, setHigh] = useState('');
    const [text, setText] = useState('');
    const [felts, setFelts] = useState('');
    const [addr, setAddr] = useState('');

    const sel = runTool(sdk, name, selectorOf);
    const fv = runTool(sdk, felt, convertFelt);
    const split = runTool(sdk, u256, splitU256);
    const joined = runTool(sdk, low && high ? `${low}|${high}` : '', (s, v) => joinU256(s, v.split('|')[0], v.split('|')[1]));
    const encoded = runTool(sdk, text, encodeByteArray);
    const decoded = runTool(sdk, felts, decodeByteArray);
    const address = runTool(sdk, addr, checkAddress);

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-4">
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                <Tool title="Selector" description="sn_keccak of a function or event name: the entry point selector, and keys[0] of an emitted event.">
                    <Input mono value={name} onChange={(e) => setName(e.target.value)} placeholder="balanceOf" aria-label="Function or event name" />
                    {sel.error && <ErrorNote message={sel.error} />}
                    {sel.value && (
                        <>
                            <ValueRow label="Hex" value={sel.value.hex} />
                            <ValueRow label="Decimal" value={sel.value.decimal} />
                        </>
                    )}
                </Tool>

                <Tool title="Felt" description="A felt252 as decimal, hex and short string. Accepts any of the three.">
                    <Input mono value={felt} onChange={(e) => setFelt(e.target.value)} placeholder="0x534e5f4d41494e, 123 or SN_MAIN" aria-label="Felt" />
                    {fv.error && <ErrorNote message={fv.error} />}
                    {fv.value && (
                        <>
                            <ValueRow label="Hex" value={fv.value.hex} />
                            <ValueRow label="Decimal" value={fv.value.decimal} />
                            {fv.value.shortString !== null && <ValueRow label="Short string" value={fv.value.shortString} mono={false} />}
                        </>
                    )}
                </Tool>

                <Tool title="u256" description="Cairo serializes a u256 as two u128 felts, low first.">
                    <Input mono value={u256} onChange={(e) => setU256(e.target.value)} placeholder="u256 value" aria-label="u256 value" />
                    {split.error && <ErrorNote message={split.error} />}
                    {split.value && (
                        <>
                            <ValueRow label="low" value={split.value.lowHex} />
                            <ValueRow label="high" value={split.value.highHex} />
                        </>
                    )}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                        <Input mono value={low} onChange={(e) => setLow(e.target.value)} placeholder="low" aria-label="u256 low" />
                        <Input mono value={high} onChange={(e) => setHigh(e.target.value)} placeholder="high" aria-label="u256 high" />
                    </div>
                    {joined.error && <ErrorNote message={joined.error} />}
                    {joined.value && <ValueRow label="Joined" value={joined.value.decimal} />}
                </Tool>

                <Tool title="ByteArray" description="Text to its serialized felts (data length, 31-byte words, pending word, pending length), and back.">
                    <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Text to encode" aria-label="ByteArray text" />
                    {encoded.error && <ErrorNote message={encoded.error} />}
                    {encoded.value && <ValueRow label={`${encoded.value.length} felts`} value={encoded.value.join(', ')} />}
                    <Textarea mono rows={2} value={felts} onChange={(e) => setFelts(e.target.value)} placeholder="0x0, 0x68656c6c6f, 0x5" aria-label="ByteArray felts" />
                    {decoded.error && <ErrorNote message={decoded.error} />}
                    {decoded.value !== null && felts.trim() && !decoded.error && <ValueRow label="Text" value={decoded.value} mono={false} />}
                </Tool>

                <Tool title="Address" description="Checks a contract address or class hash and gives its padded 64-digit form.">
                    <Input mono value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="0x…" aria-label="Address" />
                    {address.error && <ErrorNote message={address.error} />}
                    {address.value && (
                        <>
                            <ValueRow label="Padded" value={address.value.padded} />
                            <ValueRow label="Decimal" value={address.value.decimal} />
                        </>
                    )}
                </Tool>
            </div>
        </div>
    );
};
