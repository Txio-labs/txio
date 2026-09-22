/**
 * Minimal anonymous product telemetry.
 * Events are queued in memory and flushed to localStorage for inspection.
 * No network I/O — safe offline stub that still honors the Settings toggle.
 */

export type TelemetryEventName =
    | 'app_boot'
    | 'settings_changed'
    | 'request_saved'
    | 'request_sent'
    | 'tab_opened';

export interface TelemetryEvent {
    name: TelemetryEventName;
    ts: number;
    props?: Record<string, string | number | boolean | null>;
}

const QUEUE_KEY = 'txio_telemetry_queue';
const MAX_QUEUE = 100;

let enabled = true;

export const setTelemetryEnabled = (value: boolean): void => {
    enabled = value;
};

export const isTelemetryEnabled = (): boolean => enabled;

const readQueue = (): TelemetryEvent[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(QUEUE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const writeQueue = (events: TelemetryEvent[]): void => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(
            QUEUE_KEY,
            JSON.stringify(events.slice(-MAX_QUEUE))
        );
    } catch {
        // quota / private mode — drop silently
    }
};

export const track = (
    name: TelemetryEventName,
    props?: TelemetryEvent['props']
): void => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;

    const event: TelemetryEvent = {
        name,
        ts: Date.now(),
        ...(props ? { props } : {})
    };

    const queue = readQueue();
    queue.push(event);
    writeQueue(queue);
};

/** Test/debug helper — not used by UI. */
export const getTelemetryQueue = (): TelemetryEvent[] => readQueue();

export const clearTelemetryQueue = (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(QUEUE_KEY);
};
