import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StellarXdrInspector } from './StellarXdrInspector';

// The SDK's hashing rejects Node Buffers under jsdom (a cross-realm Uint8Array), so the
// decoder (covered against the real SDK in xdr.test.ts) is replaced here; this test
// checks the inspector's wiring: detection, decoding, fetching and what it renders.
vi.mock('@stellar/stellar-sdk', () => ({}));
vi.mock('@/services/adapters/stellarAdapter', () => ({ stellarPassphrase: async () => 'Test SDF Network ; September 2015' }));
vi.mock('@/services/stellar/xdr', () => ({
  STELLAR_XDR_TYPES: ['TransactionEnvelope', 'ScVal'],
  detectStellarXdrType: (_sdk: unknown, input: string) => (input === ENVELOPE ? 'TransactionEnvelope' : null),
  decodeStellarXdr: () => ({ type: 'envelopeTypeTx' }),
  decodeStellarRpcResult: (_sdk: unknown, result: Record<string, unknown>) => ({ ...result, envelopeXdr: { type: 'envelopeTypeTx' } }),
  summarizeStellarEnvelope: () => ({
    hash: HASH,
    kind: 'transaction',
    source: SOURCE,
    fee: '100',
    sequence: '42',
    signatures: 0,
    operations: [{ type: 'invokeHostFunction', contract: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC', function: 'transfer', args: [SOURCE, 'GB…', '7'] }]
  })
}));

// A testnet contract call: transfer(sender, receiver, 7), built with the SDK from fixed test keys.
const { ENVELOPE, HASH, SOURCE } = vi.hoisted(() => ({
  ENVELOPE:
  'AAAAAgAAAACKiOPddAnxlf1S2y08ul1yymcJvx2UEhvzdIgBtA9vXAAAAGQAAAAAAAAAKgAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAGAAAAAAAAAAB15KLcsJwPM/q9+uf9O9NUEpVqLl5/JtFDqLIQrTRzmEAAAAIdHJhbnNmZXIAAAADAAAAEgAAAAAAAAAAiojj3XQJ8ZX9UtstPLpdcspnCb8dlBIb83SIAbQPb1wAAAASAAAAAAAAAACBOXcOqH0XX1ajVGbDTH7My42KkbTuN6Jd9g9bj8mzlAAAAAoAAAAAAAAAAAAAAAAAAAAHAAAAAAAAAAAAAAAA',
  HASH: 'e9660a5556a02daa67bb944e8b3f02800a5ed18c2f39baad3573124d6ba244fc',
  SOURCE: 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR'
}));

afterEach(() => vi.unstubAllGlobals());

describe('StellarXdrInspector', () => {
  it('detects a pasted envelope and summarizes the contract call', async () => {
    render(<StellarXdrInspector network="testnet" />);
    fireEvent.change(screen.getByPlaceholderText(/AAAAAgAAAAB/), { target: { value: ENVELOPE } });
    fireEvent.click(screen.getByRole('button', { name: 'Decode' }));

    expect(await screen.findByText('TransactionEnvelope')).toBeInTheDocument();
    expect(screen.getByText(HASH)).toBeInTheDocument();
    expect(screen.getByText(SOURCE)).toBeInTheDocument();
    expect(screen.getByText('transfer')).toBeInTheDocument();
  });

  it('explains input it cannot decode', async () => {
    render(<StellarXdrInspector network="testnet" />);
    fireEvent.change(screen.getByPlaceholderText(/AAAAAgAAAAB/), { target: { value: 'aGVsbG8gd29ybGQ=' } });
    fireEvent.click(screen.getByRole('button', { name: 'Decode' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/not XDR of a type/);
  });

  it('fetches a transaction by hash from the selected network', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ result: { status: 'SUCCESS', ledger: 9, envelopeXdr: ENVELOPE } })
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<StellarXdrInspector network="testnet" />);
    fireEvent.change(screen.getByPlaceholderText(/AAAAAgAAAAB/), { target: { value: HASH } });
    fireEvent.click(screen.getByRole('button', { name: 'Fetch from testnet' }));

    expect(await screen.findByText('Transaction success')).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ method: 'getTransaction', params: { hash: HASH } });
    expect(screen.getByText(SOURCE)).toBeInTheDocument();
  });

  it('says when the node no longer has the transaction', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({ result: { status: 'NOT_FOUND' } }) }));
    render(<StellarXdrInspector network="testnet" />);
    fireEvent.change(screen.getByPlaceholderText(/AAAAAgAAAAB/), { target: { value: HASH } });
    fireEvent.click(screen.getByRole('button', { name: 'Fetch from testnet' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/not found on testnet/);
  });
});
