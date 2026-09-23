import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { TxTracker } from './TxTracker';

describe('TxTracker', () => {
    it('renders nothing before anything has run', () => {
        const { container } = render(<TxTracker outcome={null} progress={null} isLoading={false} />);
        expect(container.firstChild).toBeNull();
    });

    it('shows a simulation preview with return value and gas', () => {
        render(
            <TxTracker
                outcome={{ status: 200, duration: 42, timestamp: 0, result: { decoded: true, gasEstimate: '51234' } }}
                progress={null}
                isLoading={false}
            />
        );
        expect(screen.getByText('Simulated successfully')).toBeInTheDocument();
        expect(screen.getByText('51234')).toBeInTheDocument();
        expect(screen.getByText('true')).toBeInTheDocument();
    });

    it('shows the exact reason when simulation fails', () => {
        render(
            <TxTracker
                outcome={{ status: 500, duration: 5, timestamp: 0, error: 'Reverted: InsufficientBalance(5, 10)' }}
                progress={null}
                isLoading={false}
            />
        );
        expect(screen.getByText('Simulation failed')).toBeInTheDocument();
        expect(screen.getByText('Reverted: InsufficientBalance(5, 10)')).toBeInTheDocument();
    });

    it('tracks a submitted transaction with its hash and explorer link', () => {
        render(
            <TxTracker
                outcome={null}
                progress={{ stage: 'submitted', hash: '0xabc', explorerUrl: 'https://basescan.org/tx/0xabc' }}
                isLoading
            />
        );
        expect(screen.getByText('Submitted')).toBeInTheDocument();
        expect(screen.getByText('0xabc')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /view on explorer/i })).toHaveAttribute('href', 'https://basescan.org/tx/0xabc');
    });

    it('shows the decoded receipt once confirmed', () => {
        render(
            <TxTracker
                outcome={{
                    status: 200,
                    duration: 900,
                    timestamp: 0,
                    result: {
                        hash: '0xabc',
                        gasPaid: '0.00042 ETH',
                        blockNumber: '123',
                        events: [{ event: 'Transfer', args: { from: '0x7a', to: '0x3b', value: '500' } }]
                    }
                }}
                progress={{ stage: 'confirmed', hash: '0xabc' }}
                isLoading={false}
            />
        );
        expect(screen.getByText('Success')).toBeInTheDocument();
        expect(screen.getByText('0.00042 ETH')).toBeInTheDocument();
        expect(screen.getByText('Transfer')).toBeInTheDocument();
        expect(screen.getByText(/"value":"500"/)).toBeInTheDocument();
    });

    it('marks a failed transaction', () => {
        render(
            <TxTracker
                outcome={{ status: 500, duration: 0, timestamp: 0, error: 'Transaction 0xabc reverted.' }}
                progress={{ stage: 'failed', hash: '0xabc' }}
                isLoading={false}
            />
        );
        expect(screen.getByText('Failed')).toBeInTheDocument();
        expect(screen.getByText('Transaction 0xabc reverted.')).toBeInTheDocument();
    });
});
