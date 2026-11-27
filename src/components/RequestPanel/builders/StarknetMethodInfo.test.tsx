import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { StarknetMethodInfo } from './StarknetMethodInfo';

describe('StarknetMethodInfo', () => {
    it('shows the summary, spec-ordered params and a spec link for a read method', () => {
        render(<StarknetMethodInfo method="starknet_getStorageAt" />);
        expect(screen.getByText('The value at a storage key of a contract.')).toBeInTheDocument();
        expect(screen.getByText('(contract_address, key, block_id, response_flags?)')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Spec 0\.10\.3/ })).toHaveAttribute('href', expect.stringContaining('starknet_api_openrpc.json'));
        expect(screen.queryByRole('note')).toBeNull();
    });

    it('warns that a write method is sent once and never retried', () => {
        render(<StarknetMethodInfo method="starknet_addInvokeTransaction" />);
        expect(screen.getByRole('note')).toHaveTextContent('sent once, to your first endpoint, and never retried');
    });

    it('renders nothing for a method outside the spec', () => {
        const { container } = render(<StarknetMethodInfo method="starknet_customThing" />);
        expect(container).toBeEmptyDOMElement();
    });
});
