import React, { useMemo, useRef, useState } from 'react';
import { FileUp, Search } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Badge, Button, EmptyState, Input, Segmented, Textarea, cx } from '@/components/ui/primitives';
import { shortName, shortType, type CairoEntryPoint, type ParsedAbi } from '@/services/cairo/abi';
import { loadClassAt, loadClassByHash, parseAbiInput, type LoadedClass } from '@/services/cairo/contract';
import { isStarknetAddress } from '@/services/starknet';
import { FunctionPanel } from './FunctionPanel';
import { ErrorNote, JsonBlock, ValueRow } from './shared';

type Source = 'address' | 'class_hash' | 'abi';
type Section = 'functions' | 'events' | 'types';

interface Loaded {
    abi: ParsedAbi;
    classHash: string | null;
    contractClassVersion: string | null;
    origin: string;
}

const errorText = (err: unknown) => (err instanceof Error && err.message ? err.message : 'Could not load the ABI.');

/**
 * Load a contract's ABI (from the chain by address or class hash, or from a
 * pasted or uploaded ABI / class / Scarb artifact), browse what it declares,
 * and call its functions.
 */
export const ContractStudio: React.FC = () => {
    const { network } = useAppStore();
    const [source, setSource] = useState<Source>('address');
    const [input, setInput] = useState('');
    const [abiText, setAbiText] = useState('');
    const [address, setAddress] = useState('');
    const [loaded, setLoaded] = useState<Loaded | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [section, setSection] = useState<Section>('functions');
    const [filter, setFilter] = useState('');
    const [selected, setSelected] = useState<string | null>(null);
    const [showRaw, setShowRaw] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const finish = (result: LoadedClass | { abi: ParsedAbi }, origin: string) => {
        setLoaded({
            abi: result.abi,
            classHash: 'classHash' in result ? result.classHash : null,
            contractClassVersion: 'contractClassVersion' in result ? result.contractClassVersion : null,
            origin,
        });
        const first = result.abi.entryPoints.find((e) => e.kind === 'function');
        setSelected(first ? `${first.interfaceName}::${first.name}` : null);
        setSection('functions');
    };

    const load = async (text = abiText) => {
        setLoading(true);
        setError(null);
        try {
            if (source === 'address') {
                const value = input.trim();
                if (!isStarknetAddress(value)) throw new Error('Enter a contract address: 0x followed by up to 64 hex digits.');
                finish(await loadClassAt(network, value), `Deployed at ${value} on ${network}`);
                setAddress(value);
            } else if (source === 'class_hash') {
                const value = input.trim();
                if (!isStarknetAddress(value)) throw new Error('Enter a class hash: 0x followed by up to 64 hex digits.');
                finish(await loadClassByHash(network, value), `Class ${value} on ${network}`);
            } else {
                finish({ abi: await parseAbiInput(text) }, 'Pasted or uploaded ABI');
            }
        } catch (err) {
            setError(errorText(err));
        } finally {
            setLoading(false);
        }
    };

    const onFile = async (file: File | undefined) => {
        if (!file) return;
        if (file.size > 20 * 1024 * 1024) {
            setError('That file is larger than 20 MB, which is too large for a contract class.');
            return;
        }
        const text = await file.text();
        setAbiText(text);
        await load(text);
    };

    const functions = useMemo(() => {
        if (!loaded) return [];
        const q = filter.trim().toLowerCase();
        return loaded.abi.entryPoints.filter((e) => !q || e.name.toLowerCase().includes(q) || e.selector.includes(q));
    }, [loaded, filter]);

    const groups = useMemo(() => {
        const map = new Map<string, CairoEntryPoint[]>();
        for (const fn of functions) {
            const key = fn.kind === 'function' ? fn.interfaceName || 'Top-level functions' : fn.kind === 'constructor' ? 'Constructor' : 'L1 handlers';
            map.set(key, [...(map.get(key) ?? []), fn]);
        }
        return [...map.entries()];
    }, [functions]);

    const selectedFn = loaded?.abi.entryPoints.find((e) => `${e.interfaceName}::${e.name}` === selected) ?? null;

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="space-y-2 border-b border-line p-4">
                <div className="flex flex-wrap items-center gap-2">
                    <Segmented<Source>
                        size="sm"
                        value={source}
                        onChange={(v) => {
                            setSource(v);
                            setError(null);
                        }}
                        options={[
                            { value: 'address', label: 'Contract address' },
                            { value: 'class_hash', label: 'Class hash' },
                            { value: 'abi', label: 'Paste or upload' },
                        ]}
                    />
                    <span className="text-[12px] text-fg-subtle">
                        {source === 'abi' ? 'An ABI array, a contract class, or a Scarb *.contract_class.json' : `Read from ${network} with starknet_getClass${source === 'address' ? 'At' : ''}`}
                    </span>
                </div>
                {source === 'abi' ? (
                    <div className="space-y-2">
                        <Textarea mono rows={4} value={abiText} onChange={(e) => setAbiText(e.target.value)} placeholder='[{"type": "function", ...}]' aria-label="ABI JSON" />
                        <div className="flex items-center gap-2">
                            <Button variant="primary" size="sm" onClick={() => void load()} loading={loading}>
                                Parse ABI
                            </Button>
                            <Button size="sm" icon={<FileUp size={13} />} onClick={() => fileRef.current?.click()}>
                                Upload file
                            </Button>
                            <input
                                ref={fileRef}
                                type="file"
                                accept=".json,application/json"
                                className="hidden"
                                onChange={(e) => {
                                    void onFile(e.target.files?.[0]);
                                    e.target.value = '';
                                }}
                            />
                        </div>
                    </div>
                ) : (
                    <form
                        className="flex gap-2"
                        onSubmit={(e) => {
                            e.preventDefault();
                            void load();
                        }}
                    >
                        <Input mono value={input} onChange={(e) => setInput(e.target.value)} placeholder="0x…" aria-label={source === 'address' ? 'Contract address' : 'Class hash'} />
                        <Button type="submit" variant="primary" loading={loading}>
                            Load
                        </Button>
                    </form>
                )}
                {error && <ErrorNote message={error} />}
            </div>

            {!loaded ? (
                <EmptyState
                    icon={<Search size={16} />}
                    title="Load a contract"
                    description="Enter a deployed contract address or a class hash, or paste an ABI. Cairo Studio lists its functions, events and types, and lets you call it."
                />
            ) : (
                <div className="flex min-h-0 flex-1 flex-col md:flex-row">
                    <aside className="flex max-h-[40vh] min-h-0 flex-col border-b border-line md:max-h-none md:w-80 md:border-b-0 md:border-r">
                        <div className="space-y-2 border-b border-line p-3">
                            <div className="break-all text-[12px] text-fg-subtle">{loaded.origin}</div>
                            <div className="flex flex-wrap gap-1.5">
                                <Badge>{loaded.abi.cairoVersion === 1 ? `Cairo 1 (Sierra ${loaded.contractClassVersion ?? '?'})` : 'Cairo 0'}</Badge>
                                <Badge>{loaded.abi.entryPoints.length} entry points</Badge>
                                <Badge>{loaded.abi.events.length} events</Badge>
                            </div>
                            <Segmented<Section>
                                size="sm"
                                value={section}
                                onChange={setSection}
                                options={[
                                    { value: 'functions', label: 'Functions' },
                                    { value: 'events', label: 'Events' },
                                    { value: 'types', label: 'Types' },
                                ]}
                            />
                            {section === 'functions' && <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by name or selector" aria-label="Filter functions" />}
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar p-1.5">
                            {section === 'functions' &&
                                groups.map(([group, fns]) => (
                                    <div key={group} className="mb-2">
                                        <div className="truncate px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle" title={group}>
                                            {shortName(group)}
                                        </div>
                                        {fns.map((fn) => {
                                            const key = `${fn.interfaceName}::${fn.name}`;
                                            return (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    onClick={() => setSelected(key)}
                                                    aria-current={selected === key ? 'true' : undefined}
                                                    className={cx(
                                                        'flex w-full items-center gap-2 rounded-[7px] px-2 py-1.5 text-left',
                                                        selected === key ? 'bg-active text-fg' : 'text-fg-muted hover:bg-hover'
                                                    )}
                                                >
                                                    <span className="min-w-0 flex-1 truncate font-mono text-xs">{fn.name}</span>
                                                    <span className={cx('text-[10px] font-semibold uppercase', fn.mutability === 'view' ? 'text-fg-subtle' : 'text-amber-600 dark:text-amber-400')}>
                                                        {fn.mutability === 'view' ? 'view' : 'write'}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ))}
                            {section === 'events' &&
                                (loaded.abi.events.length === 0 ? (
                                    <p className="p-2 text-xs text-fg-subtle">No events in this ABI.</p>
                                ) : (
                                    loaded.abi.events.map((ev) => (
                                        <div key={ev.name} className="rounded-[7px] px-2 py-2 hover:bg-hover">
                                            <div className="flex items-center gap-2">
                                                <span className="min-w-0 flex-1 truncate font-mono text-xs text-fg" title={ev.name}>
                                                    {shortName(ev.name)}
                                                </span>
                                                <span className="text-[10px] uppercase text-fg-subtle">{ev.kind}</span>
                                            </div>
                                            <div className="mt-1 space-y-0.5">
                                                {ev.members.map((m) => (
                                                    <div key={m.name} className="flex gap-2 font-mono text-[11px] text-fg-subtle">
                                                        <span className="text-fg-muted">{m.name}</span>
                                                        <span className="truncate">{shortType(m.type)}</span>
                                                        {m.kind && <span>({m.kind})</span>}
                                                    </div>
                                                ))}
                                            </div>
                                            {ev.kind !== 'enum' && <div className="mt-1 truncate font-mono text-[11px] text-fg-subtle" title="keys[0] when emitted">key {ev.selector}</div>}
                                        </div>
                                    ))
                                ))}
                            {section === 'types' && (
                                <div className="space-y-2 p-1">
                                    {loaded.abi.structs.map((s) => (
                                        <div key={s.name}>
                                            <div className="font-mono text-xs text-fg" title={s.name}>
                                                struct {shortType(s.name)}
                                            </div>
                                            {s.members.map((m) => (
                                                <div key={m.name} className="pl-3 font-mono text-[11px] text-fg-subtle">
                                                    {m.name}: {shortType(m.type)}
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                    {loaded.abi.enums.map((en) => (
                                        <div key={en.name}>
                                            <div className="font-mono text-xs text-fg" title={en.name}>
                                                enum {shortType(en.name)}
                                            </div>
                                            {en.variants.map((v) => (
                                                <div key={v.name} className="pl-3 font-mono text-[11px] text-fg-subtle">
                                                    {v.name}
                                                    {v.type !== '()' ? `: ${shortType(v.type)}` : ''}
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                    {loaded.abi.structs.length + loaded.abi.enums.length === 0 && <p className="text-xs text-fg-subtle">No structs or enums.</p>}
                                </div>
                            )}
                        </div>
                    </aside>

                    <section className="min-h-0 flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                        <div className="space-y-1">
                            <label htmlFor="cairo-call-address" className="text-xs font-medium text-fg-muted">
                                Contract address for calls
                            </label>
                            <Input id="cairo-call-address" mono value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x…" />
                            {loaded.classHash && <ValueRow label="Class hash" value={loaded.classHash} />}
                        </div>
                        {selectedFn ? (
                            <FunctionPanel key={`${loaded.origin}|${selected}`} abi={loaded.abi} fn={selectedFn} address={address} />
                        ) : (
                            <p className="text-xs text-fg-subtle">Pick a function on the left.</p>
                        )}
                        <details className="text-xs" onToggle={(e) => setShowRaw((e.target as HTMLDetailsElement).open)}>
                            <summary className="cursor-pointer text-fg-subtle hover:text-fg">Raw ABI</summary>
                            {/* Highlighting a large ABI is slow; only do it while the section is open. */}
                            {showRaw && (
                                <div className="mt-2">
                                    <JsonBlock label="ABI" value={loaded.abi.raw} />
                                </div>
                            )}
                        </details>
                    </section>
                </div>
            )}
        </div>
    );
};
