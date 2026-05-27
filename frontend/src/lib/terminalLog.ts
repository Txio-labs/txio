import { appStore } from './store';

export interface TerminalCommandPayload {
    command: string;
    network?: string;
    body?: unknown;
    error?: string;
    status?: number;
    duration?: number;
    successLabel?: string;
}

const formatBody = (body: unknown) => {
    if (typeof body === 'string') {
        return body;
    }

    try {
        return JSON.stringify(body, null, 2);
    } catch {
        return String(body);
    }
};

export const logCommandToTerminal = (
    payload: TerminalCommandPayload
) => {
    const target = payload.network ?? 'rpc';

    appStore.pushLog(
        `$ ${payload.command}`,
        target,
        'system'
    );

    if (payload.error) {
        appStore.pushLog(
            `! ${payload.error}`,
            target,
            'error'
        );
    } else if (
        payload.body !== undefined &&
        payload.body !== null
    ) {
        appStore.pushLog(
            formatBody(payload.body),
            target,
            'request'
        );
    }

    const summaryBits: string[] = [
        payload.error
            ? '✗ failed'
            : `✓ ${payload.successLabel ?? 'ok'}`
    ];

    if (typeof payload.status === 'number') {
        summaryBits.push(`status ${payload.status}`);
    }

    if (typeof payload.duration === 'number') {
        summaryBits.push(`${payload.duration}ms`);
    }

    appStore.pushLog(
        summaryBits.join(' · '),
        target,
        payload.error ? 'error' : 'system'
    );
};

export const ensureTerminalOpen = () => {
    if (!appStore.getSnapshot().isTerminalOpen) {
        appStore.toggleTerminal();
    }
};
