import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('telemetry gate', () => {
    beforeEach(() => {
        vi.resetModules();
        localStorage.clear();
    });

    it('does not queue events when disabled', async () => {
        const tel = await import('./telemetry');
        tel.setTelemetryEnabled(false);
        tel.clearTelemetryQueue();
        tel.track('app_boot');
        expect(tel.getTelemetryQueue()).toHaveLength(0);
    });

    it('queues events when enabled', async () => {
        const tel = await import('./telemetry');
        tel.setTelemetryEnabled(true);
        tel.clearTelemetryQueue();
        tel.track('settings_changed', { key: 'telemetry', value: true });
        const q = tel.getTelemetryQueue();
        expect(q).toHaveLength(1);
        expect(q[0].name).toBe('settings_changed');
        expect(q[0].props?.key).toBe('telemetry');
    });
});

describe('saveCurrentTab + finalizeRequest dirty flag', () => {
    beforeEach(() => {
        vi.resetModules();
        localStorage.clear();
    });

    it('marks dirty on finalizeRequest and clears on saveCurrentTab', async () => {
        vi.doMock('../services/api', () => ({
            ApiError: class extends Error {
                status = 0;
            },
            apiService: {
                login: vi.fn(),
                register: vi.fn(),
                setToken: vi.fn(),
                getProfile: vi.fn(),
                getWorkspaces: vi.fn(),
                getCollections: vi.fn()
            }
        }));

        const { appStore } = await import('./store');
        const { RequestType } = await import('../types');

        appStore.openTab('rpc');

        const tabId = appStore.getSnapshot().activeTabId;
        expect(tabId).toBeTruthy();

        appStore.finalizeRequest(tabId!, 'rpc', {
            id: 'req-1',
            name: 'Test RPC',
            type: RequestType.RPC,
            network: 'testnet',
            rpcParams: { method: 'sui_getChainIdentifier', params: [] },
            moveParams: {
                packageId: '',
                module: '',
                function: '',
                typeArguments: [],
                arguments: [],
                gasBudget: '10000000'
            }
        });

        expect(
            appStore.getSnapshot().tabs.find((t) => t.id === tabId)?.isDirty
        ).toBe(true);

        appStore.saveCurrentTab();

        const after = appStore.getSnapshot();
        expect(after.tabs.find((t) => t.id === tabId)?.isDirty).toBe(false);
        expect(after.savedTabs.some((t) => t.id === tabId)).toBe(true);

        // Second save upserts, not duplicates
        appStore.finalizeRequest(tabId!, 'rpc', {
            id: 'req-1',
            name: 'Test RPC v2',
            type: RequestType.RPC,
            network: 'testnet',
            rpcParams: { method: 'sui_getChainIdentifier', params: [] },
            moveParams: {
                packageId: '',
                module: '',
                function: '',
                typeArguments: [],
                arguments: [],
                gasBudget: '10000000'
            }
        });
        appStore.saveCurrentTab();
        expect(
            after.savedTabs.filter((t) => t.id === tabId).length
        ).toBeLessThanOrEqual(1);
        expect(
            appStore.getSnapshot().savedTabs.filter((t) => t.id === tabId)
        ).toHaveLength(1);
    });

    it('updateSettings toggles all three flags', async () => {
        vi.doMock('../services/api', () => ({
            ApiError: class extends Error {
                status = 0;
            },
            apiService: {
                login: vi.fn(),
                register: vi.fn(),
                setToken: vi.fn(),
                getProfile: vi.fn(),
                getWorkspaces: vi.fn(),
                getCollections: vi.fn()
            }
        }));

        const { appStore } = await import('./store');
        appStore.updateSettings({
            showLineNumbers: false,
            autoSave: false,
            telemetry: false
        });
        const s = appStore.getSnapshot().settings;
        expect(s.showLineNumbers).toBe(false);
        expect(s.autoSave).toBe(false);
        expect(s.telemetry).toBe(false);
    });
});
