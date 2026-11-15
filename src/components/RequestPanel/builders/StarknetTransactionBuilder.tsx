import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Select } from '../../Select';
import type { Network, RequestItem, StarknetCall, StarknetTxParams } from '../../../types';
import { newStarknetCall, newStarknetTxParams } from '@/services/adapters/starknetAdapter';
import { getDiscoveryAdapter } from '@/services/discovery';
import { DiscoveryError, type DiscoveredFunction, type DiscoveredPackage } from '@/services/discovery/types';
import { isStarknetAddress, shortCairoType } from '@/services/starknet';

interface StarknetTransactionBuilderProps {
  request: RequestItem;
  activeAddress: string | null;
  network: Network;
  isReadOnly?: boolean;
  onChange: (updatedReq: RequestItem) => void;
}

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; pkg: DiscoveredPackage };

const fieldClass =
  'w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs font-mono text-fg focus:border-line-strong focus:outline-none transition-colors';
const labelClass = 'block text-[12px] font-semibold text-fg-subtle mb-1.5';

const placeholderFor = (type: string): string => {
  const short = shortCairoType(type);
  if (short === 'ContractAddress' || short === 'ClassHash') return '0x…';
  if (short === 'bool') return 'true / false';
  if (short === 'u256') return 'whole number, e.g. 1000000000000000000';
  if (short === 'ByteArray') return 'text';
  if (/^(Array|Span)</.test(short)) return 'JSON array, e.g. ["0x1", "0x2"]';
  if (/^(felt252|bytes31|u\d+|i\d+)$/.test(short)) return 'number, 0x hex or short string';
  return `JSON for ${short}`;
};

export const StarknetTransactionBuilder: React.FC<StarknetTransactionBuilderProps> = ({
  request,
  activeAddress,
  network,
  isReadOnly,
  onChange
}) => {
  const params: StarknetTxParams = request.starknetTxParams ?? newStarknetTxParams();

  const setCalls = useCallback(
    (calls: StarknetCall[]) => onChange({ ...request, starknetTxParams: { calls } }),
    [onChange, request]
  );

  const updateCall = (index: number, updates: Partial<StarknetCall>) =>
    setCalls(params.calls.map((c, i) => (i === index ? { ...c, ...updates } : c)));

  return (
    <div className="p-4 rounded-[10px] border border-line bg-sunken space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-fg">Starknet invoke</div>
          <div className="text-[12px] text-fg-subtle mt-0.5">
            {params.calls.length > 1
              ? `${params.calls.length} calls run in order in one transaction. If one fails, none apply.`
              : 'Add more calls to run them together in one transaction.'}
          </div>
        </div>
        {activeAddress && (
          <div className="flex items-center gap-2 px-2.5 py-1 bg-surface border border-line rounded-full text-[12px] font-mono text-emerald-500 dark:text-emerald-400 shrink-0">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            Account: {activeAddress.slice(0, 6)}...{activeAddress.slice(-4)}
          </div>
        )}
      </div>

      {params.calls.map((call, i) => (
        <CallCard
          key={call.id}
          call={call}
          index={i}
          total={params.calls.length}
          network={network}
          isReadOnly={isReadOnly}
          onUpdate={(updates) => updateCall(i, updates)}
          onRemove={() => setCalls(params.calls.filter((_, j) => j !== i))}
        />
      ))}

      <button
        type="button"
        onClick={() => setCalls([...params.calls, newStarknetCall()])}
        disabled={isReadOnly}
        className="text-xs flex items-center gap-1 text-fg hover:opacity-80 disabled:opacity-50"
      >
        <Plus size={12} /> Add call
      </button>

      <p className="text-[12px] text-fg-subtle">
        Your wallet estimates the fee and signs. Simulation runs from your account contract, so the account must already be deployed on {network}.
      </p>
    </div>
  );
};

const CallCard: React.FC<{
  call: StarknetCall;
  index: number;
  total: number;
  network: Network;
  isReadOnly?: boolean;
  onUpdate: (updates: Partial<StarknetCall>) => void;
  onRemove: () => void;
}> = ({ call, index, total, network, isReadOnly, onUpdate, onRemove }) => {
  const [load, setLoad] = useState<LoadState>({ status: 'idle' });
  const ticketRef = useRef(0);
  const address = call.contractAddress.trim();
  const valid = isStarknetAddress(address);

  const loadAbi = useCallback(
    async (addr: string) => {
      const ticket = ++ticketRef.current;
      setLoad({ status: 'loading' });
      try {
        const pkg = await getDiscoveryAdapter('starknet').discoverPackage(addr, network);
        if (ticket === ticketRef.current) setLoad({ status: 'loaded', pkg });
      } catch (error) {
        const message = error instanceof DiscoveryError || error instanceof Error ? error.message : 'Could not load the ABI.';
        if (ticket === ticketRef.current) setLoad({ status: 'error', message });
      }
    },
    [network]
  );

  // Debounced load once the address is well-formed, and again on network change:
  // the same address can hold a different class (or nothing) on another network.
  useEffect(() => {
    if (call.rawCalldata || !valid) {
      ticketRef.current++;
      return;
    }
    const timer = setTimeout(() => void loadAbi(address), 400);
    return () => clearTimeout(timer);
  }, [address, valid, network, call.rawCalldata, loadAbi]);

  const view: LoadState = valid ? load : { status: 'idle' };
  const loadedPkg = view.status === 'loaded' ? view.pkg : null;
  const functions = useMemo(
    () => (loadedPkg ? loadedPkg.modules.flatMap((m) => m.functions.filter((f) => f.isEntry)) : ([] as DiscoveredFunction[])),
    [loadedPkg]
  );
  const selected = functions.find((f) => f.name === call.entrypoint) ?? null;

  const selectFunction = (name: string) => {
    const fn = functions.find((f) => f.name === name);
    if (fn) onUpdate({ entrypoint: fn.name, args: fn.parameters.map(() => '') });
  };

  const setArg = (i: number, value: string) => {
    const args = [...call.args];
    args[i] = value;
    onUpdate({ args });
  };

  return (
    <div className="p-3.5 rounded-lg border border-line bg-surface space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold text-fg">{total > 1 ? `Call ${index + 1}` : 'Call'}</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onUpdate({ rawCalldata: !call.rawCalldata, args: [] })}
            disabled={isReadOnly}
            className="text-[12px] text-fg hover:opacity-80 disabled:opacity-50"
          >
            {call.rawCalldata ? 'Use contract ABI' : 'Enter raw calldata'}
          </button>
          {total > 1 && (
            <button
              type="button"
              onClick={onRemove}
              disabled={isReadOnly}
              aria-label={`Remove call ${index + 1}`}
              className="p-1 text-fg-subtle hover:text-rose-500 transition-colors disabled:opacity-50"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor={`sn-address-${call.id}`}>Contract address</label>
        <div className="flex gap-2">
          <input
            id={`sn-address-${call.id}`}
            className={fieldClass}
            value={call.contractAddress}
            onChange={(e) => onUpdate({ contractAddress: e.target.value, ...(call.rawCalldata ? {} : { entrypoint: '', args: [] }) })}
            placeholder="0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d"
            disabled={isReadOnly}
          />
          {!call.rawCalldata && (
            <button
              type="button"
              onClick={() => valid && void loadAbi(address)}
              disabled={isReadOnly || !valid || view.status === 'loading'}
              aria-label="Reload ABI"
              className="p-2 text-fg-subtle hover:text-fg transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={view.status === 'loading' ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
        {!call.rawCalldata && view.status === 'idle' && (
          <p className="mt-1.5 text-[12px] text-fg-subtle">Enter a contract address to load its functions.</p>
        )}
        {!call.rawCalldata && view.status === 'loading' && (
          <p className="mt-1.5 text-[12px] text-fg-subtle">Loading the contract ABI from {network}…</p>
        )}
        {!call.rawCalldata && view.status === 'error' && (
          <p role="alert" className="mt-1.5 text-[12px] text-rose-500">
            {view.message} You can still{' '}
            <button type="button" onClick={() => onUpdate({ rawCalldata: true, args: [] })} className="underline">
              enter raw calldata
            </button>
            .
          </p>
        )}
        {!call.rawCalldata && view.status === 'loaded' && functions.length === 0 && (
          <p className="mt-1.5 text-[12px] text-fg-subtle">This contract has no external functions.</p>
        )}
      </div>

      {call.rawCalldata ? (
        <RawFields call={call} onUpdate={onUpdate} isReadOnly={isReadOnly} />
      ) : (
        functions.length > 0 && (
          <>
            <div>
              <label className={labelClass}>Function</label>
              <Select
                value={selected?.name ?? ''}
                options={functions.map((f) => ({ label: f.module ? `${shortCairoType(f.module)} · ${f.name}` : f.name, value: f.name }))}
                onChange={selectFunction}
                placeholder="Select a function"
                fullWidth
                disabled={isReadOnly}
              />
            </div>
            {selected && (
              <div>
                <label className={labelClass}>Arguments</label>
                {selected.parameters.length === 0 ? (
                  <div className="text-center py-3 bg-sunken border border-dashed border-line rounded-lg">
                    <span className="text-xs text-fg-subtle">This function takes no arguments.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selected.parameters.map((p, i) => (
                      <div key={`${selected.name}-${i}`}>
                        <div className="text-[12px] font-mono text-fg-subtle mb-1">
                          {p.name}: {shortCairoType(p.type)}
                        </div>
                        <input
                          aria-label={`${p.name} (${shortCairoType(p.type)})`}
                          className={fieldClass}
                          value={call.args[i] ?? ''}
                          onChange={(e) => setArg(i, e.target.value)}
                          placeholder={placeholderFor(p.type)}
                          disabled={isReadOnly}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )
      )}
    </div>
  );
};

const RawFields: React.FC<{
  call: StarknetCall;
  onUpdate: (updates: Partial<StarknetCall>) => void;
  isReadOnly?: boolean;
}> = ({ call, onUpdate, isReadOnly }) => (
  <div className="space-y-4">
    <div>
      <label className={labelClass} htmlFor={`sn-entry-${call.id}`}>Function name</label>
      <input
        id={`sn-entry-${call.id}`}
        className={fieldClass}
        value={call.entrypoint}
        onChange={(e) => onUpdate({ entrypoint: e.target.value })}
        placeholder="transfer"
        disabled={isReadOnly}
      />
    </div>
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <label className="text-[12px] font-semibold text-fg-subtle">Calldata (felts)</label>
        <button
          type="button"
          onClick={() => onUpdate({ args: [...call.args, ''] })}
          disabled={isReadOnly}
          className="text-xs flex items-center gap-1 text-fg hover:opacity-80 disabled:opacity-50"
        >
          <Plus size={12} /> Add felt
        </button>
      </div>
      <div className="space-y-2">
        {call.args.map((felt, i) => (
          <div key={i} className="flex gap-2">
            <input
              aria-label={`Felt ${i + 1}`}
              className={`flex-1 min-w-0 ${fieldClass}`}
              value={felt}
              onChange={(e) => onUpdate({ args: call.args.map((a, j) => (j === i ? e.target.value : a)) })}
              placeholder="0x… or decimal"
              disabled={isReadOnly}
            />
            <button
              type="button"
              onClick={() => onUpdate({ args: call.args.filter((_, j) => j !== i) })}
              disabled={isReadOnly}
              aria-label={`Remove felt ${i + 1}`}
              className="p-2 text-fg-subtle hover:text-rose-500 transition-colors disabled:opacity-50"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {call.args.length === 0 && (
          <div className="text-center py-3 bg-sunken border border-dashed border-line rounded-lg">
            <span className="text-xs text-fg-subtle">No calldata. A u256 takes two felts: low, then high.</span>
          </div>
        )}
      </div>
    </div>
  </div>
);
