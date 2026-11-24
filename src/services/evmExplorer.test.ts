import { describe, expect, it } from 'vitest';
import {
  evmExplorerSupported,
  formatEvmAmount,
  mapEvmAddress,
  mapEvmTokenHolding,
  mapEvmTokenTransfer,
  mapEvmTransaction,
  parseEvmExplorerQuery,
} from './evmExplorer';

const HASH = `0x${'ab'.repeat(32)}`;
const ADDR = `0x${'cd'.repeat(20)}`;

describe('parseEvmExplorerQuery', () => {
  it('splits a 32-byte hash from a 20-byte address', () => {
    expect(parseEvmExplorerQuery(HASH)).toEqual({ kind: 'tx', id: HASH });
    expect(parseEvmExplorerQuery(` ${ADDR} `)).toEqual({ kind: 'address', id: ADDR });
  });

  it('rejects other lengths and text', () => {
    expect(parseEvmExplorerQuery('0x1234')).toBeNull();
    expect(parseEvmExplorerQuery('hello')).toBeNull();
  });
});

describe('mapEvmTransaction', () => {
  it('maps a successful transaction and derives the fee from gas', () => {
    const tx = mapEvmTransaction({
      hash: HASH,
      status: 'ok',
      result: 'success',
      block_number: 26485390,
      timestamp: '2026-11-24T13:42:59.000000Z',
      from: { hash: ADDR },
      to: { hash: '0xFEEEEEE44046c3f61a8CC081E0918eF0de0a7ffC' },
      created_contract: null,
      value: '8182186568398470',
      gas_used: '29022',
      gas_price: '181162170',
      fee: null,
      method: '0x6b059463',
      transaction_types: ['coin_transfer', 'contract_call'],
    });
    expect(tx).toMatchObject({
      status: 'success',
      blockNumber: '26485390',
      from: ADDR,
      valueWei: '8182186568398470',
      feeWei: (BigInt(29022) * BigInt(181162170)).toString(),
      txTypes: ['coin_transfer', 'contract_call'],
    });
  });

  it('marks a reverted transaction failed and a null status pending', () => {
    expect(mapEvmTransaction({ hash: HASH, status: 'error', result: 'Reverted' })?.status).toBe('failed');
    expect(mapEvmTransaction({ hash: HASH, status: null })?.status).toBe('pending');
  });
});

describe('mapEvmTokenTransfer', () => {
  it('reads symbol, decimals and value from a transfer item', () => {
    expect(
      mapEvmTokenTransfer({
        from: ADDR,
        to: { hash: ADDR },
        token: { address_hash: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', decimals: '6' },
        total: { decimals: '6', value: '3219964514' },
      })
    ).toEqual({
      from: ADDR,
      to: ADDR,
      tokenAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      symbol: 'USDT',
      decimals: 6,
      value: '3219964514',
    });
  });
});

describe('mapEvmAddress and token holdings', () => {
  it('maps the native balance and ENS name', () => {
    expect(
      mapEvmAddress({ hash: ADDR, coin_balance: '6360081512245653954', is_contract: false, ens_domain_name: 'x.eth', exchange_rate: '1691.54', transactions_count: null })
    ).toMatchObject({ coinBalanceWei: '6360081512245653954', isContract: false, ensName: 'x.eth', transactionsCount: null });
  });

  it('maps a token balance item', () => {
    expect(
      mapEvmTokenHolding({
        token: { address_hash: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', name: 'WETH', symbol: 'WETH', decimals: '18' },
        value: '2000000000000000000',
        token_id: null,
      })
    ).toEqual({
      tokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      name: 'WETH',
      symbol: 'WETH',
      decimals: 18,
      valueRaw: '2000000000000000000',
    });
  });
});

describe('formatEvmAmount', () => {
  it('scales by decimals and trims trailing zeros', () => {
    expect(formatEvmAmount('2000000000000000000', 18)).toBe('2');
    expect(formatEvmAmount('3219964514', 6)).toBe('3219.964514');
    expect(formatEvmAmount('123', null)).toBe('123');
  });
});

describe('evmExplorerSupported', () => {
  it('covers the Blockscout-backed chains only', () => {
    expect(evmExplorerSupported(1)).toBe(true);
    expect(evmExplorerSupported(11155111)).toBe(true);
    expect(evmExplorerSupported(999999)).toBe(false);
  });
});
