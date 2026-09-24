import { HistoryItem, RequestType } from '../types';

/**
 * CSV/JSON export of history entries, suitable for accounting/tax use —
 * human-readable columns (ISO timestamps, not epoch millis), one row per
 * request. Exports whatever set is passed in (callers pass the *filtered*
 * set from History.tsx, not always everything).
 */

const explorerUrlFor = (item: HistoryItem): string => {
    const result = item.executionResult;
    if (result && typeof result === 'object' && 'explorerUrl' in result) {
        const url = (result as { explorerUrl?: unknown }).explorerUrl;
        return typeof url === 'string' ? url : '';
    }
    return '';
};

const targetFor = (item: HistoryItem): string => {
    if (item.type === RequestType.RPC) {
        return item.rpcParams?.method ?? '';
    }
    if (item.txType === 'MoveCall' && item.moveParams) {
        return `${item.moveParams.packageId}::${item.moveParams.module}::${item.moveParams.function}`;
    }
    return item.txType ?? '';
};

const CSV_COLUMNS = [
    'Timestamp',
    'Chain',
    'Network',
    'Wallet',
    'Type',
    'Target',
    'Status',
    'Duration (ms)',
    'Explorer URL'
] as const;

const rowFor = (item: HistoryItem): string[] => [
    item.timestamp ? new Date(item.timestamp).toISOString() : '',
    item.rpcParams?.chain ?? '',
    item.network ?? '',
    item.walletAddress ?? '',
    item.type === RequestType.RPC ? 'RPC' : 'Transaction',
    targetFor(item),
    String(item.status ?? ''),
    String(item.duration ?? ''),
    explorerUrlFor(item)
];

/** Escapes a value for CSV: wraps in quotes and doubles internal quotes whenever it contains a comma, quote, or newline. */
const csvEscape = (value: string): string =>
    /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

const toCsv = (items: HistoryItem[]): string => {
    const lines = [CSV_COLUMNS.join(',')];
    for (const item of items) {
        lines.push(rowFor(item).map(csvEscape).join(','));
    }
    return lines.join('\n');
};

const toJson = (items: HistoryItem[]): string =>
    JSON.stringify(
        items.map((item) => ({
            timestamp: item.timestamp ? new Date(item.timestamp).toISOString() : null,
            chain: item.rpcParams?.chain ?? null,
            network: item.network ?? null,
            walletFamily: item.walletFamily ?? null,
            walletAddress: item.walletAddress ?? null,
            type: item.type === RequestType.RPC ? 'RPC' : 'Transaction',
            target: targetFor(item),
            status: item.status ?? null,
            durationMs: item.duration ?? null,
            explorerUrl: explorerUrlFor(item) || null
        })),
        null,
        2
    );

const downloadBlob = (content: string, mimeType: string, filename: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};

export const exportHistory = (items: HistoryItem[], format: 'csv' | 'json') => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    if (format === 'csv') {
        downloadBlob(toCsv(items), 'text/csv', `txio-history-${timestamp}.csv`);
    } else {
        downloadBlob(toJson(items), 'application/json', `txio-history-${timestamp}.json`);
    }
};
