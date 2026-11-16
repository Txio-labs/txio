import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RequestType, type RequestItem } from '@/types';
import type { DiscoveredPackage } from '@/services/discovery/types';

const CONTRACT = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

const pkg: DiscoveredPackage = {
    chain: 'stellar',
    network: 'testnet',
    identifier: CONTRACT,
    metadata: { source: 'contractspecv0' },
    modules: [
        {
            name: 'contract',
            functions: [
                {
                    name: 'send',
                    module: 'contract',
                    visibility: 'Public',
                    isEntry: true,
                    typeParameters: [],
                    doc: 'Sends tokens.',
                    returnTypes: ['bool'],
                    parameters: [
                        { name: 'ids', type: 'vec<u32>', kind: 'vector', required: true, resolution: 'user_input', multiline: true, example: '[\n  1\n]', placeholder: '[\n  1\n]' },
                        { name: 'to', type: 'address', kind: 'address', required: true, resolution: 'user_input', placeholder: 'G… or C… address' }
                    ]
                }
            ]
        }
    ]
};

vi.mock('@/services/discovery', () => ({ getDiscoveryAdapter: () => ({ discoverPackage: async () => pkg }) }));
vi.mock('@/services/stellar/spec', () => ({
    loadStellarSpec: async () => ({ spec: {}, source: 'wasm' }),
    validateSpecArg: (_spec: unknown, _fn: string, index: number, raw: string) => (index === 0 && raw === '[1,' ? 'ids: is not valid JSON.' : null)
}));

import { StellarTransactionBuilder } from './StellarTransactionBuilder';

const base: RequestItem = {
    id: 'r',
    name: 'r',
    type: RequestType.TRANSACTION,
    rpcParams: { method: '', params: [], chain: 'stellar' },
    moveParams: { packageId: '', module: '', function: '', typeArguments: [], arguments: [], gasBudget: '' },
    stellarTxParams: { contractId: CONTRACT, function: '', args: [] }
};

const Harness: React.FC<{ onChange?: (r: RequestItem) => void }> = ({ onChange }) => {
    const [request, setRequest] = useState(base);
    return (
        <StellarTransactionBuilder
            request={request}
            activeAddress={null}
            network="testnet"
            onChange={(r) => {
                setRequest(r);
                onChange?.(r);
            }}
        />
    );
};

describe('StellarTransactionBuilder with a contract spec', () => {
    it('builds typed fields from the spec, with JSON input, examples and validation', async () => {
        const onChange = vi.fn();
        render(<Harness onChange={onChange} />);

        fireEvent.click(await screen.findByRole('button', { name: /Select a function/ }, { timeout: 2000 }));
        fireEvent.click(screen.getByRole('button', { name: 'send' }));

        expect(onChange.mock.lastCall?.[0].stellarTxParams).toMatchObject({ function: 'send', fromSpec: true });
        expect(screen.getByText(/Sends tokens\./)).toHaveTextContent('Returns bool.');

        const ids = screen.getByLabelText('Argument 1 (vec<u32>)');
        expect(ids.tagName).toBe('TEXTAREA');
        expect(screen.getByLabelText('Argument 2 (address)').tagName).toBe('INPUT');

        fireEvent.click(screen.getByRole('button', { name: 'Insert example' }));
        expect(ids).toHaveValue('[\n  1\n]');

        fireEvent.change(ids, { target: { value: '[1,' } });
        expect(screen.getByText('ids: is not valid JSON.')).toBeInTheDocument();
        expect(ids).toHaveAttribute('aria-invalid', 'true');
    });
});
