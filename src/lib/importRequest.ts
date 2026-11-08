// Helpers for importing RPC requests from a pasted cURL command or an
// uploaded .json/.har file into the "New Request" flow.
//
// Txio's RPC builder only models a JSON-RPC call (`method` + `params`)
// executed against the currently selected network, so import here means
// extracting that JSON-RPC payload from whatever the user hands us —
// not replaying arbitrary HTTP requests (headers, auth, etc. are parsed
// where useful but otherwise discarded).

import type { ChainId } from '../types';

export interface ImportedRpcRequest {
  name: string;
  method: string;
  params: any[];
  /** Best guess at the chain, from the method name, params shape or endpoint host. */
  chain?: ChainId;
}

const SOLANA_ONLY = new Set([
  'getAccountInfo', 'getSignaturesForAddress', 'getTokenAccountsByOwner', 'getBlockHeight', 'getLatestBlockhash',
  'getEpochInfo', 'getSupply', 'getSlot', 'getVersion', 'getProgramAccounts', 'getMultipleAccounts',
  'getTokenAccountBalance', 'getRecentPrioritizedFees', 'getMinimumBalanceForRentExemption'
]);
const STELLAR_ONLY = new Set([
  'getLatestLedger', 'getLedgerEntries', 'getEvents', 'getNetwork', 'getFeeStats', 'getVersionInfo', 'getTransactions'
]);

/** Guesses which chain a JSON-RPC call targets. Undefined when nothing is conclusive. */
export function inferChain(method: string, params?: unknown, url?: string): ChainId | undefined {
  if (/^(sui|suix|unsafe)_/.test(method)) return 'sui';
  if (/^(eth|net|web3|debug|trace|txpool)_/.test(method)) return 'evm';
  if (STELLAR_ONLY.has(method)) return 'stellar';
  if (SOLANA_ONLY.has(method)) return 'solana';
  // Soroban RPC is the only supported chain that takes a params object.
  if (params && typeof params === 'object' && !Array.isArray(params)) return 'stellar';

  let host = '';
  try {
    host = url ? new URL(url).hostname.toLowerCase() : '';
  } catch {
    host = '';
  }
  if (!host) return undefined;
  if (host.includes('sui')) return 'sui';
  if (host.includes('solana')) return 'solana';
  if (host.includes('soroban') || host.includes('stellar')) return 'stellar';
  if (host.includes('aptos')) return 'aptos';
  if (/(ethereum|infura|alchemy|llamarpc|base\.org|arbitrum|optimism|polygon|bnbchain|avax|linea|scroll|zksync|blast|mantle|gnosis|celo|cronos)/.test(host)) return 'evm';
  return undefined;
}

/** Soroban sends one params object; the app stores it as a single-element array. */
const normalizeParams = (params: unknown): any[] =>
  Array.isArray(params) ? params : params && typeof params === 'object' ? [params] : [];

export interface ParsedCurl {
  url?: string;
  method?: string;
  headers: Record<string, string>;
  body?: string;
}

// Splits a cURL command into shell-like tokens, honoring single/double
// quotes and the backslash-newline continuations common in copy-pasted
// multi-line examples (e.g. from docs or browser devtools).
function tokenizeCurl(input: string): string[] {
  const normalized = input.replace(/\\\r?\n/g, ' ').trim();
  const tokens: string[] = [];
  let i = 0;
  const n = normalized.length;

  while (i < n) {
    while (i < n && /\s/.test(normalized[i])) i++;
    if (i >= n) break;

    let token = '';
    let quote: string | null = null;

    while (i < n) {
      const ch = normalized[i];

      if (quote) {
        if (ch === '\\' && quote === '"' && i + 1 < n) {
          token += normalized[i + 1];
          i += 2;
          continue;
        }
        if (ch === quote) {
          quote = null;
          i++;
          continue;
        }
        token += ch;
        i++;
        continue;
      }

      if (ch === '"' || ch === "'") {
        quote = ch;
        i++;
        continue;
      }

      if (/\s/.test(ch)) break;

      token += ch;
      i++;
    }

    tokens.push(token);
  }

  return tokens;
}

const DATA_FLAGS = new Set(['-d', '--data', '--data-raw', '--data-binary', '--data-ascii']);

export function parseCurl(input: string): ParsedCurl {
  const tokens = tokenizeCurl(input);
  const result: ParsedCurl = { headers: {} };
  let i = tokens[0] === 'curl' ? 1 : 0;

  for (; i < tokens.length; i++) {
    const token = tokens[i];

    if (token === '-X' || token === '--request') {
      result.method = tokens[++i];
      continue;
    }

    if (token === '-H' || token === '--header') {
      const header = tokens[++i] || '';
      const separatorIndex = header.indexOf(':');
      if (separatorIndex > -1) {
        result.headers[header.slice(0, separatorIndex).trim()] =
          header.slice(separatorIndex + 1).trim();
      }
      continue;
    }

    if (DATA_FLAGS.has(token)) {
      result.body = tokens[++i];
      if (!result.method) result.method = 'POST';
      continue;
    }

    if (token.startsWith('-')) {
      // Unrecognized flag. Most curl flags we don't care about (-s, -k, -i, --compressed,
      // -u user:pass, etc.) are safe to skip without consuming the next token.
      continue;
    }

    if (!result.url) {
      result.url = token;
    }
  }

  return result;
}

export function extractRpcPayload(bodyText: string): { method: string; params: any[]; rawParams: unknown } {
  let parsed: unknown;

  try {
    parsed = JSON.parse(bodyText);
  } catch {
    throw new Error('Request body is not valid JSON');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Expected a JSON-RPC object body with a "method" field');
  }

  const candidate = parsed as { method?: unknown; params?: unknown };

  if (typeof candidate.method !== 'string' || !candidate.method) {
    throw new Error('JSON body is missing a "method" field');
  }

  return {
    method: candidate.method,
    params: normalizeParams(candidate.params),
    rawParams: candidate.params
  };
}

export function curlToRpcRequest(curlText: string): ImportedRpcRequest {
  if (!curlText.trim()) {
    throw new Error('Paste a cURL command to import');
  }

  const parsed = parseCurl(curlText);

  if (!parsed.body) {
    throw new Error('No request body (-d/--data) found in the cURL command');
  }

  const { method, params, rawParams } = extractRpcPayload(parsed.body);

  return { name: method, method, params, chain: inferChain(method, rawParams, parsed.url) };
}

function requestFromCandidate(item: any): ImportedRpcRequest | null {
  // Accept either a raw JSON-RPC body ({method, params}) or our own
  // RequestItem export shape ({name, rpcParams: {method, params}}).
  const source =
    item && typeof item === 'object' && item.rpcParams && typeof item.rpcParams === 'object'
      ? item.rpcParams
      : item;

  if (!source || typeof source !== 'object' || typeof source.method !== 'string' || !source.method) {
    return null;
  }

  const knownChain = typeof source.chain === 'string' ? (source.chain as ChainId) : undefined;
  return {
    name: typeof item?.name === 'string' && item.name.trim() ? item.name : source.method,
    method: source.method,
    params: normalizeParams(source.params),
    chain: knownChain ?? inferChain(source.method, source.params)
  };
}

function parseHarFile(har: any): ImportedRpcRequest[] {
  const entries = Array.isArray(har?.log?.entries) ? har.log.entries : [];
  const results: ImportedRpcRequest[] = [];

  entries.forEach((entry: any, index: number) => {
    const text = entry?.request?.postData?.text;
    if (typeof text !== 'string') return;

    try {
      const { method, params, rawParams } = extractRpcPayload(text);
      results.push({
        name: method || `Imported Request ${index + 1}`,
        method,
        params,
        chain: inferChain(method, rawParams, entry?.request?.url)
      });
    } catch {
      // Not every HAR entry is a JSON-RPC call (analytics beacons, asset
      // requests, etc.) — skip anything that doesn't parse as one.
    }
  });

  return results;
}

export function parseImportFile(text: string): ImportedRpcRequest[] {
  let data: unknown;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('File is not valid JSON');
  }

  if (data && typeof data === 'object' && (data as any).log?.entries) {
    const results = parseHarFile(data);
    if (!results.length) {
      throw new Error('No JSON-RPC requests found in HAR file');
    }
    return results;
  }

  const items = Array.isArray(data) ? data : [data];
  const results = items
    .map(requestFromCandidate)
    .filter((r): r is ImportedRpcRequest => r !== null);

  if (!results.length) {
    throw new Error('No JSON-RPC requests found in file');
  }

  return results;
}
