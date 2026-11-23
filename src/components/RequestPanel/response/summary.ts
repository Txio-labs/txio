// Short, human-readable view of an RPC result: the figure the request is
// asking for, rather than the whole JSON body. Mirrors the txio CLI's
// `call`/`balance` output so both surfaces show the same thing. Exact integer
// math (BigInt) throughout, so no value passes through a float.

const SUI_SUI_TYPE = /^0x0*2::sui::SUI$/;

/** Base units -> fixed-precision decimal, rounded to nearest (ties up). */
export const formatUnitsFixed = (value: bigint, decimals: number, places: number): string => {
  const p = Math.min(places, decimals);
  const divisor = 10n ** BigInt(decimals);
  const whole = value / divisor;
  const frac = value % divisor;
  const scale = 10n ** BigInt(decimals - p);
  const rounded = (frac + scale / 2n) / scale;
  const carry = rounded / 10n ** BigInt(p);
  const fracPart = rounded % 10n ** BigInt(p);
  return `${whole + carry}.${fracPart.toString().padStart(p, '0')}`;
};

/** Methods whose result is a balance, keyed by frontend chain id. */
const BALANCE_METHODS: Record<string, string[]> = {
  sui: ['suix_getAllBalances', 'suix_getBalance'],
  evm: ['eth_getBalance'],
  solana: ["getBalance"],
  stellar: ["getBalance"],
};

const toBigInt = (v: unknown): bigint | null => {
  try {
    if (typeof v === 'string' && v.length > 0) return BigInt(v);
    if (typeof v === 'number' && Number.isSafeInteger(v)) return BigInt(v);
  } catch {
    /* not an integer */
  }
  return null;
};

const balanceLines = (chain: string, value: unknown): string[] | null => {
  if (chain === 'sui') {
    const entries = Array.isArray(value)
      ? value
      : value && typeof value === 'object'
        ? [value]
        : null;
    if (!entries) return null;
    if (entries.length === 0) return ['0 SUI'];
    return entries.map((raw) => {
      const item = (raw ?? {}) as Record<string, unknown>;
      const total = typeof item.totalBalance === 'string' ? item.totalBalance : '0';
      const coinType = typeof item.coinType === 'string' ? item.coinType : 'Unknown';
      if (SUI_SUI_TYPE.test(coinType)) {
        const base = toBigInt(total);
        return base !== null ? `${formatUnitsFixed(base, 9, 4)} SUI` : `${total} SUI`;
      }
      return `${total} ${coinType}`;
    });
  }
  if (chain === 'evm') {
    if (typeof value !== 'string' || !/^0x[0-9a-fA-F]+$/.test(value)) return null;
    return [`${formatUnitsFixed(BigInt(value), 18, 4)} ETH`];
  }
  if (chain === 'solana') {
    const lamports = value && typeof value === 'object' ? toBigInt((value as { value?: unknown }).value) : null;
    return lamports !== null ? [`${formatUnitsFixed(lamports, 9, 4)} SOL`] : null;
  }
  if (chain === 'stellar') {
    // Horizon account: one entry per asset, amounts are 7-decimal strings ("0.9580461").
    const balances = value && typeof value === 'object' ? (value as { balances?: unknown }).balances : null;
    if (!Array.isArray(balances)) return null;
    return balances.map((raw) => {
      const item = (raw ?? {}) as Record<string, unknown>;
      const amount = typeof item.balance === 'string' ? item.balance : '0';
      const [whole, frac = ''] = amount.split('.');
      const base = toBigInt(`${whole || '0'}${frac.padEnd(7, '0').slice(0, 7)}`);
      const shown = base !== null ? `${formatUnitsFixed(base, 7, 4)}` : amount;
      const code = item.asset_type === 'native' ? 'XLM' : typeof item.asset_code === 'string' ? item.asset_code : 'Unknown';
      return `${shown} ${code}`;
    });
  }
  return null;
};

/**
 * The figure(s) to show for an RPC result, or null when the full body should
 * be shown instead. Balance methods get a formatted balance; any other method
 * with a scalar result (string, number, boolean) shows that value bare.
 */
/** One line per transaction: "2025-11-23 10:45  in   17.7967525 XLM  payment  success". */
const historyLines = (value: unknown): string[] | null => {
  const items = value && typeof value === 'object' ? (value as { items?: unknown }).items : null;
  if (!Array.isArray(items)) return null;
  const isHistoryItem = (raw: unknown): raw is Record<string, unknown> =>
    !!raw && typeof raw === 'object' && 'direction' in raw && 'hash' in raw;
  if (!items.every(isHistoryItem)) return null;
  if (items.length === 0) return ['No transactions'];
  return items.map((item) => {
    const ts = typeof item.timestamp === 'number' ? new Date(item.timestamp * 1000).toISOString().slice(0, 16).replace('T', ' ') : '—';
    const amount = typeof item.amount === 'string' && item.amount ? item.amount : '—';
    const label = typeof item.label === 'string' && item.label ? item.label : 'transaction';
    const status = typeof item.status === 'string' ? item.status : 'unknown';
    return `${ts}  ${String(item.direction).padEnd(7)}  ${amount}  ${label}  ${status}`;
  });
};

export const summarizeResult = (chain: string | undefined, method: string | undefined, result: unknown): string[] | null => {
  if (result === undefined) return null;
  if (chain && method && BALANCE_METHODS[chain]?.includes(method)) {
    return balanceLines(chain, result);
  }
  const history = historyLines(result);
  if (history) return history;
  if (typeof result === 'string') return [result];
  if (typeof result === 'number' || typeof result === 'boolean') return [String(result)];
  return null;
};
