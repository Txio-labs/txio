import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ContextToolbar } from './ContextToolbar';

const ToolbarHarness = () => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

  const handleToggleFilter = () => {
    if (isFilterOpen) {
      setFilterQuery('');
    }

    setIsFilterOpen(!isFilterOpen);
  };

  return (
    <>
      <ContextToolbar
        mode="collections"
        isFilterOpen={isFilterOpen}
        filterQuery={filterQuery}
        onFilterQueryChange={setFilterQuery}
        onToggleFilter={handleToggleFilter}
      />
      <output aria-label="Current filter">{filterQuery}</output>
    </>
  );
};

describe('ContextToolbar collection filter', () => {
  it('opens an accessible, focused filter input', () => {
    render(
      <ContextToolbar
        mode="collections"
        isFilterOpen
        filterQuery=""
        onFilterQueryChange={vi.fn()}
      />
    );

    const input = screen.getByRole('searchbox', {
      name: 'Filter collections'
    });

    expect(input).toHaveFocus();
    expect(input).toHaveAttribute(
      'placeholder',
      'Filter by name or RPC method...'
    );
  });

  it('updates the query and clears it when Escape closes the filter', async () => {
    const user = userEvent.setup();
    render(<ToolbarHarness />);

    await user.click(screen.getByRole('button', {
      name: 'Filter collections'
    }));

    const input = screen.getByRole('searchbox', {
      name: 'Filter collections'
    });

    await user.type(input, 'sui_getObject');
    expect(screen.getByRole('status', {
      name: 'Current filter'
    })).toHaveTextContent('sui_getObject');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.getByRole('status', {
      name: 'Current filter'
    })).toBeEmptyDOMElement();
  });
});
