import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ResponsePanel } from './ResponsePanel';
import { RequestOutcome } from './types';

const successOutcome: RequestOutcome = {
  status: 200,
  duration: 124,
  timestamp: Date.now(),
  result: { id: 1, value: 'ok' },
};

const errorOutcome: RequestOutcome = {
  status: 500,
  duration: 42,
  timestamp: Date.now(),
  error: 'RPC node unreachable',
};

describe('ResponsePanel', () => {
  it('shows an empty state when there is no outcome and nothing is loading', () => {
    render(<ResponsePanel outcome={null} isLoading={false} />);
    expect(screen.getByText(/Send a request to see the response here/i)).toBeInTheDocument();
  });

  it('shows a loading state while a request is in flight', () => {
    render(<ResponsePanel outcome={null} isLoading={true} />);
    expect(screen.getByText(/Waiting for response/i)).toBeInTheDocument();
  });

  it('renders the status row and Response Details footer for a successful outcome', () => {
    render(<ResponsePanel outcome={successOutcome} isLoading={false} />);

    expect(screen.getAllByText((_, el) => el?.textContent === '200 OK').length).toBeGreaterThan(0);
    expect(screen.getAllByText((_, el) => el?.textContent === '124 ms').length).toBeGreaterThan(0);

    expect(screen.getByText('Response Details')).toBeInTheDocument();
    expect(screen.getByText('Content Type')).toBeInTheDocument();
    expect(screen.getByText('application/json')).toBeInTheDocument();
  });

  it('renders the JSON-RPC error message on an error outcome', () => {
    render(<ResponsePanel outcome={errorOutcome} isLoading={false} />);
    expect(screen.getAllByText((_, el) => el?.textContent === '500 Internal Error').length).toBeGreaterThan(0);
    expect(screen.getByText(/RPC node unreachable/)).toBeInTheDocument();
  });

  it('switches to the Headers tab and shows the explanatory empty state', () => {
    render(<ResponsePanel outcome={successOutcome} isLoading={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Headers' }));
    expect(
      screen.getByText(/don't expose transport-level HTTP headers/i)
    ).toBeInTheDocument();
  });

  it('switches to the Timing tab and shows the total duration', () => {
    render(<ResponsePanel outcome={successOutcome} isLoading={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Timing' }));
    expect(screen.getByText('Total duration')).toBeInTheDocument();
    expect(screen.getAllByText((_, el) => el?.textContent === '124 ms').length).toBeGreaterThan(0);
  });

  it('switches to the Raw tab and renders the raw JSON body', () => {
    render(<ResponsePanel outcome={successOutcome} isLoading={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Raw' }));
    expect(screen.getByText(/"value"/)).toBeInTheDocument();
  });

  it('copies the response body to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<ResponsePanel outcome={successOutcome} isLoading={false} />);
    fireEvent.click(screen.getByTitle('Copy'));

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toContain('"value"');
  });

  it('opens the search box and reports a match count', () => {
    render(<ResponsePanel outcome={successOutcome} isLoading={false} />);
    fireEvent.click(screen.getByTitle('Search'));

    const input = screen.getByPlaceholderText('Search response...');
    fireEvent.change(input, { target: { value: 'value' } });

    expect(screen.getByText('1 match')).toBeInTheDocument();
  });
});
