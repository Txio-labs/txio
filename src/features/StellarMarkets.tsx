'use client';

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { Network } from '@/types';
import { StellarExplorerFeature } from './StellarExplorer';
import {
  getStellarAssetHolders,
  getStellarAssets,
  getStellarCandles,
  getStellarOrderBook,
  getStellarPool,
  getStellarPoolHolders,
  getStellarPools,
  getStellarPoolTrades,
  getStellarTrades,
  parseAssetRef,
  summarizePrice,
  type StellarAssetRef,
} from '@/services/stellarMarkets';

const short = (value: string, head = 10, tail = 6) =>
  value.length > head + tail + 1 ? `${value.slice(0, head)}…${value.slice(-tail)}` : value;

const Panel: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="rounded-card border border-line bg-sunken p-4">
    <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-fg-subtle">{title}</h3>
    {children}
  </section>
);
const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
    <span className="shrink-0 text-fg-subtle">{label}</span>
    <span className="min-w-0 break-all text-right font-mono text-xs text-fg">{value}</span>
  </div>
);
const Muted = ({ children }: { children: React.ReactNode }) => <div className="text-xs text-fg-subtle">{children}</div>;
const ErrorText = ({ message }: { message: string }) => <div className="text-xs text-red-500">{message}</div>;
const Loading = () => (
  <div className="flex items-center gap-2 text-xs text-fg-subtle">
    <Loader2 size={14} className="animate-spin" /> Loading…
  </div>
);

const SearchBar: React.FC<{ value: string; onChange: (v: string) => void; onSubmit: () => void; placeholder: string }> = ({
  value,
  onChange,
  onSubmit,
  placeholder,
}) => (
  <form
    onSubmit={(e) => {
      e.preventDefault();
      onSubmit();
    }}
    className="flex items-center gap-2"
  >
    <div className="relative flex-1">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-card border border-line bg-sunken py-2 pl-9 pr-3 font-mono text-xs text-fg outline-none focus:border-fg-subtle"
      />
    </div>
    <button type="submit" className="rounded-card border border-line px-4 py-2 text-xs font-semibold text-fg hover:bg-hover">
      Search
    </button>
  </form>
);

const AssetView: React.FC<{ network: Network }> = ({ network }) => {
  const [input, setInput] = useState('');
  const [asset, setAsset] = useState<StellarAssetRef | null>(null);
  const [invalid, setInvalid] = useState(false);

  const info = useQuery({
    queryKey: ['stellar-asset', network, asset?.code, asset?.issuer],
    enabled: Boolean(asset),
    queryFn: () => getStellarAssets(network, asset!, 1),
  });
  const holders = useQuery({
    queryKey: ['stellar-asset-holders', network, asset?.code, asset?.issuer],
    enabled: Boolean(asset && asset.type !== 'native'),
    queryFn: () => getStellarAssetHolders(network, asset!, 20),
  });
  const candles = useQuery({
    queryKey: ['stellar-asset-candles', network, asset?.code, asset?.issuer],
    enabled: Boolean(asset),
    queryFn: () => {
      const now = Date.now();
      const xlm: StellarAssetRef = { type: 'native', code: 'XLM' };
      return getStellarCandles(network, asset!, xlm, 86_400_000, now - 8 * 86_400_000, now);
    },
  });

  // dataUpdatedAt is when these candles were fetched. Using it keeps render pure.
  const price = useMemo(
    () => (candles.data ? summarizePrice(candles.data, candles.dataUpdatedAt) : null),
    [candles.data, candles.dataUpdatedAt]
  );
  const meta = info.data?.[0];

  return (
    <div className="flex flex-col gap-4">
      <SearchBar
        value={input}
        onChange={setInput}
        placeholder="Asset as XLM or CODE:ISSUER (G…)"
        onSubmit={() => {
          const parsed = parseAssetRef(input);
          setInvalid(!parsed);
          setAsset(parsed);
        }}
      />
      {invalid && <ErrorText message="Enter XLM or CODE:G… (issuer account)." />}
      {asset && info.isLoading && <Loading />}
      {info.error && <ErrorText message={(info.error as Error).message} />}
      {asset && !info.isLoading && !info.error && !meta && <Muted>No such asset on this network.</Muted>}
      {meta && (
        <>
          <Panel title={`${meta.code}`}>
            <Field label="Issuer" value={meta.issuer || '—'} />
            <Field label="Supply" value={meta.supply} />
            <Field label="Holders" value={meta.holders} />
            <Field label="Claimable balances" value={meta.claimableBalancesAmount} />
            <Field label="In liquidity pools" value={meta.liquidityPoolsAmount} />
            <Field label="Auth required" value={String(meta.flags.authRequired)} />
            <Field label="Auth revocable" value={String(meta.flags.authRevocable)} />
            <Field label="Clawback enabled" value={String(meta.flags.authClawbackEnabled)} />
          </Panel>
          <Panel title="Price (in XLM)">
            {candles.isLoading ? (
              <Loading />
            ) : candles.error ? (
              <ErrorText message={(candles.error as Error).message} />
            ) : !price || price.last === null ? (
              <Muted>No trades in the last 8 days.</Muted>
            ) : (
              <>
                <Field label="Last" value={price.last} />
                <Field label="24h change" value={price.change24hPct === null ? '—' : `${price.change24hPct.toFixed(2)}%`} />
                <Field label="7d change" value={price.change7dPct === null ? '—' : `${price.change7dPct.toFixed(2)}%`} />
                <Field label="24h volume (XLM)" value={price.volume24h} />
              </>
            )}
          </Panel>
          {asset?.type !== 'native' && (
            <Panel title="Top holders">
              {holders.isLoading ? (
                <Loading />
              ) : holders.error ? (
                <ErrorText message={(holders.error as Error).message} />
              ) : !holders.data?.length ? (
                <Muted>No holders.</Muted>
              ) : (
                <ul className="divide-y divide-line">
                  {holders.data.map((h) => (
                    <li key={h.account} className="flex justify-between gap-4 py-1.5 text-xs">
                      <span className="font-mono text-fg">{short(h.account, 10, 6)}</span>
                      <span className="font-mono text-fg">{h.balance}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}
        </>
      )}
    </div>
  );
};

const DexView: React.FC<{ network: Network }> = ({ network }) => {
  const [baseInput, setBaseInput] = useState('XLM');
  const [counterInput, setCounterInput] = useState('');
  const [pair, setPair] = useState<{ base: StellarAssetRef; counter: StellarAssetRef } | null>(null);
  const [invalid, setInvalid] = useState(false);

  const book = useQuery({
    queryKey: ['stellar-dex-book', network, pair?.base.code, pair?.base.issuer, pair?.counter.code, pair?.counter.issuer],
    enabled: Boolean(pair),
    queryFn: () => getStellarOrderBook(network, pair!.base, pair!.counter, 15),
  });
  const trades = useQuery({
    queryKey: ['stellar-dex-trades', network, pair?.base.code, pair?.base.issuer, pair?.counter.code, pair?.counter.issuer],
    enabled: Boolean(pair),
    queryFn: () => getStellarTrades(network, pair!.base, pair!.counter, 20),
  });

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const base = parseAssetRef(baseInput);
          const counter = parseAssetRef(counterInput);
          const ok = Boolean(base && counter);
          setInvalid(!ok);
          setPair(ok ? { base: base!, counter: counter! } : null);
        }}
        className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]"
      >
        <input
          value={baseInput}
          onChange={(e) => setBaseInput(e.target.value)}
          placeholder="Base: XLM or CODE:G…"
          className="rounded-card border border-line bg-sunken px-3 py-2 font-mono text-xs text-fg outline-none focus:border-fg-subtle"
        />
        <input
          value={counterInput}
          onChange={(e) => setCounterInput(e.target.value)}
          placeholder="Counter: XLM or CODE:G…"
          className="rounded-card border border-line bg-sunken px-3 py-2 font-mono text-xs text-fg outline-none focus:border-fg-subtle"
        />
        <button type="submit" className="rounded-card border border-line px-4 py-2 text-xs font-semibold text-fg hover:bg-hover">
          Show market
        </button>
      </form>
      {invalid && <ErrorText message="Both sides must be XLM or CODE:G… (issuer account)." />}
      {pair && (
        <>
          <Panel title="Order book">
            {book.isLoading ? (
              <Loading />
            ) : book.error ? (
              <ErrorText message={(book.error as Error).message} />
            ) : (
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="mb-1 text-green-600">Bids (buy base)</div>
                  {book.data?.bids.length ? book.data.bids.map((l, i) => (
                    <div key={i} className="flex justify-between font-mono"><span>{l.price}</span><span>{l.amount}</span></div>
                  )) : <Muted>None</Muted>}
                </div>
                <div>
                  <div className="mb-1 text-red-500">Asks (sell base)</div>
                  {book.data?.asks.length ? book.data.asks.map((l, i) => (
                    <div key={i} className="flex justify-between font-mono"><span>{l.price}</span><span>{l.amount}</span></div>
                  )) : <Muted>None</Muted>}
                </div>
              </div>
            )}
          </Panel>
          <Panel title="Recent trades">
            {trades.isLoading ? (
              <Loading />
            ) : trades.error ? (
              <ErrorText message={(trades.error as Error).message} />
            ) : !trades.data?.length ? (
              <Muted>No trades.</Muted>
            ) : (
              <ul className="divide-y divide-line">
                {trades.data.map((t) => (
                  <li key={t.id} className="flex justify-between gap-4 py-1.5 text-xs">
                    <span className="text-fg-subtle">{new Date(t.ledgerCloseTime).toLocaleString()}</span>
                    <span className="font-mono text-fg">{t.price}</span>
                    <span className="font-mono text-fg">{t.baseAmount}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </div>
  );
};

const PoolsView: React.FC<{ network: Network }> = ({ network }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const pools = useQuery({
    queryKey: ['stellar-pools', network],
    queryFn: () => getStellarPools(network, 20),
  });
  const pool = useQuery({
    queryKey: ['stellar-pool', network, selected],
    enabled: Boolean(selected),
    queryFn: () => getStellarPool(network, selected!),
  });
  const poolTrades = useQuery({
    queryKey: ['stellar-pool-trades', network, selected],
    enabled: Boolean(selected),
    queryFn: () => getStellarPoolTrades(network, selected!, 20),
  });
  const holders = useQuery({
    queryKey: ['stellar-pool-holders', network, selected],
    enabled: Boolean(selected),
    queryFn: () => getStellarPoolHolders(network, selected!, 20),
    retry: false,
  });

  if (selected) {
    return (
      <div className="flex flex-col gap-4">
        <button type="button" onClick={() => setSelected(null)} className="self-start text-xs text-fg-subtle hover:text-fg">
          ← All pools
        </button>
        {pool.isLoading ? (
          <Loading />
        ) : pool.error ? (
          <ErrorText message={(pool.error as Error).message} />
        ) : !pool.data ? (
          <Muted>Pool not found.</Muted>
        ) : (
          <>
            <Panel title="Pool">
              <Field label="ID" value={pool.data.id} />
              <Field label="Fee (bp)" value={pool.data.feeBp} />
              <Field label="Total shares" value={pool.data.totalShares} />
              <Field label="Trustlines" value={pool.data.totalTrustlines} />
              {pool.data.reserves.map((r) => (
                <Field key={r.asset} label={r.asset} value={r.amount} />
              ))}
            </Panel>
            <Panel title="Recent trades">
              {poolTrades.isLoading ? (
                <Loading />
              ) : poolTrades.error ? (
                <ErrorText message={(poolTrades.error as Error).message} />
              ) : !poolTrades.data?.length ? (
                <Muted>No trades through this pool.</Muted>
              ) : (
                <ul className="divide-y divide-line">
                  {poolTrades.data.map((t) => (
                    <li key={t.id} className="flex justify-between gap-4 py-1.5 text-xs">
                      <span className="text-fg-subtle">{new Date(t.ledgerCloseTime).toLocaleString()}</span>
                      <span className="font-mono text-fg">{t.price}</span>
                      <span className="font-mono text-fg">{t.baseAmount}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title="Share holders">
              {holders.isLoading ? (
                <Loading />
              ) : holders.error ? (
                <Muted>Holder list unavailable: {(holders.error as Error).message}</Muted>
              ) : !holders.data?.length ? (
                <Muted>No holders.</Muted>
              ) : (
                <ul className="divide-y divide-line">
                  {holders.data.map((h) => (
                    <li key={h.account} className="flex justify-between gap-4 py-1.5 text-xs">
                      <span className="font-mono text-fg">{short(h.account, 10, 6)}</span>
                      <span className="font-mono text-fg">{h.balance}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </>
        )}
      </div>
    );
  }

  return (
    <Panel title="Liquidity pools">
      {pools.isLoading ? (
        <Loading />
      ) : pools.error ? (
        <ErrorText message={(pools.error as Error).message} />
      ) : !pools.data?.length ? (
        <Muted>No pools.</Muted>
      ) : (
        <ul className="divide-y divide-line">
          {pools.data.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => setSelected(p.id)} className="flex w-full justify-between gap-4 py-2 text-left text-xs hover:bg-hover">
                <span className="font-mono text-fg">{short(p.id, 10, 6)}</span>
                <span className="text-fg-subtle">
                  {p.reserves.map((r) => `${r.amount} ${r.asset === 'native' ? 'XLM' : r.asset.split(':')[0]}`).join(' / ')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
};

type MarketTab = 'Explorer' | 'Assets' | 'DEX' | 'Pools';
const MARKET_TABS: MarketTab[] = ['Explorer', 'Assets', 'DEX', 'Pools'];

/** Stellar workspace tab: explorer search plus assets, DEX and liquidity pools. */
export const StellarWorkspace: React.FC<{ initialQuery?: string }> = ({ initialQuery = '' }) => {
  const { network } = useAppStore();
  const net = network as Network;
  const [tab, setTab] = useState<MarketTab>('Explorer');
  // Explorer search keeps its own state; the top-level tab only switches views.
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-5 custom-scrollbar">
      <div className="flex gap-1 border-b border-line">
        {MARKET_TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-xs font-medium ${tab === t ? 'border-b-2 border-fg text-fg' : 'text-fg-subtle hover:text-fg'}`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'Explorer' && <StellarExplorerFeature initialQuery={initialQuery} />}
      {tab === 'Assets' && <AssetView network={net} />}
      {tab === 'DEX' && <DexView network={net} />}
      {tab === 'Pools' && <PoolsView network={net} />}
    </div>
  );
};
