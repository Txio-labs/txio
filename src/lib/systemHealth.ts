import {
    ActivityLog,
    RPCHealthMetric
} from '../types';

export type SystemHealthState = {
    status:
        | 'healthy'
        | 'degraded'
        | 'error'
        | 'unknown';
    label: string;
    message: string;
    toastType:
        | 'success'
        | 'info'
        | 'error';
};
export const deriveSystemHealth = (
    rpcHealth: Pick<RPCHealthMetric, 'status'> | null,
    activityLogs: Pick<ActivityLog, 'type'>[]
): SystemHealthState => {
    if (rpcHealth?.status === 'down') {
        return {
            status: 'error',
            label: 'RPC Offline',
            message:
                'The active RPC endpoint is unavailable.',
            toastType: 'error'
        };
    }

    if (
        activityLogs.some(
            (log) => log.type === 'error'
        )
    ) {
        return {
            status: 'error',
            label: 'Recent Errors',
            message:
                'Recent errors detected. Open the terminal for details.',
            toastType: 'error'
        };
    }

    if (rpcHealth?.status === 'degraded') {
        return {
            status: 'degraded',
            label: 'RPC Degraded',
            message:
                'The active RPC endpoint is responding slowly.',
            toastType: 'info'
        };
    }

    if (rpcHealth?.status === 'healthy') {
        return {
            status: 'healthy',
            label: 'System Optimal',
            message:
                'System operational. No recent errors.',
            toastType: 'success'
        };
    }

    return {
        status: 'unknown',
        label: 'Checking System',
        message:
            'System health is still being checked.',
        toastType: 'info'
    };
};
