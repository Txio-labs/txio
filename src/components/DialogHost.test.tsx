import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { confirmDialog, DialogHost, promptDialog } from './DialogHost';

describe('DialogHost', () => {
    it('resolves a confirm with the button pressed, and false on Escape', async () => {
        render(<DialogHost />);
        let result: Promise<boolean> = Promise.resolve(false);
        act(() => {
            result = confirmDialog({ title: 'Delete thing?', confirmLabel: 'Delete', destructive: true });
        });
        fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
        await expect(result).resolves.toBe(true);
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

        act(() => {
            result = confirmDialog({ title: 'Again?' });
        });
        await screen.findByRole('dialog');
        fireEvent.keyDown(window, { key: 'Escape' });
        await expect(result).resolves.toBe(false);
    });

    it('resolves a prompt with the trimmed value, or null on cancel', async () => {
        render(<DialogHost />);
        let result: Promise<string | null> = Promise.resolve(null);
        act(() => {
            result = promptDialog({ title: 'New collection', label: 'Name', initialValue: 'My Collection', confirmLabel: 'Create' });
        });
        const input = await screen.findByDisplayValue('My Collection');
        fireEvent.change(input, { target: { value: '  Soroban  ' } });
        fireEvent.click(screen.getByRole('button', { name: 'Create' }));
        await expect(result).resolves.toBe('Soroban');

        act(() => {
            result = promptDialog({ title: 'Name it', label: 'Name' });
        });
        fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
        await expect(result).resolves.toBeNull();
    });
});
