import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React, { useState } from 'react';
import { Select, SelectOption } from './Select';

const OPTIONS: SelectOption[] = [
    { label: 'address', value: 'address' },
    { label: 'i128', value: 'i128' },
    { label: 'u128', value: 'u128' },
    { label: 'i64', value: 'i64' }
];

const Harness: React.FC<{ initial?: string; size?: 'xs' | 'sm' | 'md' }> = ({ initial = 'address', size }) => {
    const [value, setValue] = useState(initial);
    return <Select value={value} options={OPTIONS} onChange={setValue} size={size} />;
};

describe('Select', () => {
    it('opens the menu through a portal, escaping a clipping/scrolling ancestor', () => {
        // Reproduces the reported bug: a narrow trigger inside an
        // overflow-hidden scroll container (the request panel body, the
        // terminal panel, etc.) used to clip the open dropdown instead of
        // letting it float above everything.
        const { container } = render(
            <div style={{ width: 120, height: 80, overflow: 'hidden' }} data-testid="clipping-ancestor">
                <Harness />
            </div>
        );

        fireEvent.click(screen.getByRole('button', { name: /address/i }));

        const ancestor = within(container).getByTestId('clipping-ancestor');
        const option = screen.getByRole('button', { name: 'i128' });

        // The open menu must not be a descendant of the clipping ancestor —
        // it's rendered via a portal straight onto document.body instead.
        expect(ancestor.contains(option)).toBe(false);
        expect(document.body.contains(option)).toBe(true);
    });

    it('selects an option and closes the menu', () => {
        render(<Harness />);
        fireEvent.click(screen.getByRole('button', { name: /address/i }));
        fireEvent.click(screen.getByRole('button', { name: 'i128' }));

        expect(screen.getByRole('button', { name: /i128/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'u128' })).not.toBeInTheDocument();
    });

    it('closes when clicking outside, without changing the value', () => {
        render(
            <div>
                <Harness />
                <button>outside</button>
            </div>
        );
        fireEvent.click(screen.getByRole('button', { name: /address/i }));
        expect(screen.getByRole('button', { name: 'i128' })).toBeInTheDocument();

        fireEvent.mouseDown(screen.getByRole('button', { name: 'outside' }));
        expect(screen.queryByRole('button', { name: 'i128' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /address/i })).toBeInTheDocument();
    });

    it('marks the currently selected option with a check', () => {
        render(<Harness initial="u128" />);
        fireEvent.click(screen.getByRole('button', { name: /^u128$/i }));
        // Selected option renders with the check icon; others don't.
        const selected = screen.getAllByRole('button', { name: 'u128' }).find((b) => b.querySelector('svg.lucide-check'));
        expect(selected).toBeTruthy();
    });
});
