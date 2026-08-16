import {
    describe,
    expect,
    it
} from 'vitest';

import { deriveSystemHealth } from './systemHealth';

describe('deriveSystemHealth', () => {
    it('reports healthy RPC state with no errors as optimal', () => {
        expect(
            deriveSystemHealth(
                { status: 'healthy' },
                []
            )
        ).toMatchObject({
            status: 'healthy',
            label: 'System Optimal',
            toastType: 'success'
        });
    });

    it('reports degraded RPC state', () => {
        expect(
            deriveSystemHealth(
                { status: 'degraded' },
                []
            )
        ).toMatchObject({
            status: 'degraded',
            label: 'RPC Degraded',
            toastType: 'info'
        });
    });

    it('reports a down RPC before other signals', () => {
        expect(
            deriveSystemHealth(
                { status: 'down' },
                [{ type: 'error' }]
            )
        ).toMatchObject({
            status: 'error',
            label: 'RPC Offline',
            toastType: 'error'
        });
    });

    it('reports any recent error in a mixed activity log', () => {
        expect(
            deriveSystemHealth(
                { status: 'healthy' },
                [
                    { type: 'request' },
                    { type: 'error' },
                    { type: 'system' }
                ]
            )
        ).toMatchObject({
            status: 'error',
            label: 'Recent Errors',
            toastType: 'error'
        });
    });

    it('uses an honest unknown state before the RPC check completes', () => {
        expect(
            deriveSystemHealth(null, [])
        ).toMatchObject({
            status: 'unknown',
            label: 'Checking System',
            toastType: 'info'
        });
    });
});
