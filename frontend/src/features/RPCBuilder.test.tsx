import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { RPCBuilder } from './RPCBuilder';
import { RequestType } from '../types';

// Mock dependencies
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className }: any) => <div className={className}>{children}</div>
  }
}));

vi.mock('@mysten/dapp-kit', () => ({
  useSignAndExecuteTransaction: () => ({
    mutateAsync: vi.fn()
  })
}));

const { mockAppStore, mockWallet } = vi.hoisted(() => ({
  mockAppStore: {
    tabs: [],
    activeTabId: null,
    network: 'testnet',
    envVariables: [],
    getSnapshot: () => ({ envVariables: [] }),
    finalizeRequest: vi.fn(),
    addToHistory: vi.fn(),
    pushLog: vi.fn(),
  },
  mockWallet: {
    currentWallet: { family: 'sui', address: '0x123' },
    openModal: vi.fn(),
  }
}));

vi.mock('@/lib/store', () => ({
  useAppStore: () => mockAppStore,
  appStore: mockAppStore
}));

vi.mock('@/wallet', () => ({
  useWallet: () => mockWallet
}));

vi.mock('../components/RequestPanel/RequestPanel', () => ({
  RequestPanel: ({ onExecute }: any) => (
    <div data-testid="request-panel">
      <button onClick={onExecute}>Execute Request</button>
    </div>
  )
}));

vi.mock('../components/SignTransactionModal', () => ({
  SignTransactionModal: ({ isOpen, onExecute }: any) => isOpen ? (
    <div data-testid="sign-modal">
      <button onClick={onExecute} data-testid="sign-confirm">Confirm Sign</button>
    </div>
  ) : null
}));

vi.mock('../services/suiService', () => ({
  executeSuiRpc: vi.fn(),
  looksLikeSuiNs: vi.fn().mockReturnValue(false),
  resolveSuiAddress: vi.fn(),
  simulateMoveCall: vi.fn(),
  signAndExecuteMoveCall: vi.fn().mockResolvedValue({ result: 'ok', duration: 100, status: 200 }),
  SuiRpcError: class SuiRpcError extends Error {}
}));

vi.mock('@/lib/terminalLog', () => ({
  ensureTerminalOpen: vi.fn(),
  logCommandToTerminal: vi.fn(),
}));

vi.mock('@/lib/hooksEngine', () => ({
  runHooks: vi.fn().mockResolvedValue(undefined),
}));

describe('RPCBuilder Execution Flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAppStore.tabs = [
      {
        id: 'tab-1',
        data: {
          type: RequestType.TRANSACTION,
          moveParams: { packageId: '0x1', module: 'm', function: 'f', typeArguments: [], arguments: [] },
          hooks: {}
        }
      }
    ] as any;
    mockAppStore.activeTabId = 'tab-1' as any;
  });

  it('bypasses mainnet warning on testnet and executes directly', async () => {
    mockAppStore.network = 'testnet';
    render(<RPCBuilder />);
    
    // Open SignModal
    fireEvent.click(screen.getByText('Execute Request'));
    
    // Click execute in SignModal
    fireEvent.click(screen.getByTestId('sign-confirm'));

    // Verify mainnet warning is NOT shown
    expect(screen.queryByText('Mainnet Execution Warning')).not.toBeInTheDocument();
  });

  it('shows mainnet warning when network is mainnet', async () => {
    mockAppStore.network = 'mainnet';
    render(<RPCBuilder />);
    
    // Open SignModal
    fireEvent.click(screen.getByText('Execute Request'));
    
    // Click execute in SignModal
    fireEvent.click(screen.getByTestId('sign-confirm'));

    // Verify mainnet warning IS shown
    expect(screen.getByText('Mainnet Execution Warning')).toBeInTheDocument();
    
    // Confirm execution
    fireEvent.click(screen.getByText('Confirm & Execute'));
    
    await waitFor(() => {
      expect(screen.queryByText('Mainnet Execution Warning')).not.toBeInTheDocument();
    });
  });
});
