import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const requestNetworkSwitch = vi.fn();
const openTab = vi.fn();

vi.mock('@/lib/store', () => ({
  useAppStore: () => ({ network: 'mainnet' }),
  appStore: {
    requestNetworkSwitch: (...a: unknown[]) => requestNetworkSwitch(...a),
    openTab: (...a: unknown[]) => openTab(...a),
  },
}));

import { NetworkMenu } from './NetworkMenu';
import { NetworkSwitcherModal } from './NetworkSwitcherModal';

describe('NetworkMenu', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists every network and asks to switch when one is picked', () => {
    render(<NetworkMenu />);
    fireEvent.click(screen.getByTitle('Switch network'));
    expect(screen.getAllByRole('option')).toHaveLength(4);
    fireEvent.click(screen.getByRole('option', { name: /Testnet/ }));
    expect(requestNetworkSwitch).toHaveBeenCalledWith('testnet');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('supports number keys', () => {
    render(<NetworkMenu />);
    fireEvent.click(screen.getByTitle('Switch network'));
    fireEvent.keyDown(screen.getByRole('listbox'), { key: '3' });
    expect(requestNetworkSwitch).toHaveBeenCalledWith('devnet');
  });

  it('opens endpoint settings', () => {
    render(<NetworkMenu />);
    fireEvent.click(screen.getByTitle('Switch network'));
    fireEvent.click(screen.getByText('Manage endpoints'));
    expect(openTab).toHaveBeenCalledWith('infrastructure');
  });
});

describe('NetworkSwitcherModal', () => {
  it('warns before switching to mainnet and confirms once', () => {
    const onConfirm = vi.fn();
    render(<NetworkSwitcherModal isOpen from="testnet" to="mainnet" onClose={() => {}} onConfirm={onConfirm} />);
    expect(screen.getByText(/real funds and can/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Mainnet' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<NetworkSwitcherModal isOpen from="mainnet" to="devnet" onClose={onClose} onConfirm={() => {}} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
