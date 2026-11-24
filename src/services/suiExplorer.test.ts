import { describe, expect, it } from 'vitest';
import {
  mapSuiCheckpoint,
  mapSuiCoin,
  mapSuiEvent,
  mapSuiObject,
  mapSuiPackage,
  mapSuiTransaction,
  parseSuiExplorerQuery,
} from './suiExplorer';

describe('parseSuiExplorerQuery', () => {
  it('treats hex as an object id and pads it', () => {
    expect(parseSuiExplorerQuery('0x2')).toEqual({ kind: 'object', id: `0x${'0'.repeat(63)}2` });
  });

  it('treats a base58 string of digest length as a transaction digest', () => {
    const digest = 'FfhSmXE9bYtGZ7wrxtwJ2Eq3ZEw3uZxwUVhgSbwgtTmU';
    expect(digest).toHaveLength(44);
    expect(parseSuiExplorerQuery(` ${digest} `)).toEqual({ kind: 'tx', id: digest });
  });

  it('rejects empty and unrecognised input', () => {
    expect(parseSuiExplorerQuery('   ')).toBeNull();
    expect(parseSuiExplorerQuery('hello world')).toBeNull();
  });
});

describe('mapSuiTransaction', () => {
  it('maps status, gas, balance changes and events', () => {
    const tx = mapSuiTransaction({
      digest: 'D1',
      sender: { address: '0xaa' },
      gasInput: { gasPrice: '1000', gasBudget: '5000000' },
      kind: { __typename: 'ProgrammableTransaction' },
      effects: {
        status: 'FAILURE',
        timestamp: '2026-11-20T10:00:00Z',
        checkpoint: { sequenceNumber: '99' },
        epoch: { epochId: '7' },
        gasEffects: { gasSummary: { computationCost: '1000000', storageCost: '2000000', storageRebate: '500000' } },
        balanceChanges: { nodes: [{ owner: { address: '0xaa' }, amount: '-100', coinType: { repr: '0x2::sui::SUI' } }] },
        events: { nodes: [{ sender: { address: '0xaa' }, contents: { type: { repr: '0x1::m::E' }, json: { v: 1 } }, timestamp: null }] },
      },
    });
    expect(tx).toMatchObject({
      digest: 'D1',
      status: 'failed',
      kind: 'Programmable',
      checkpoint: '99',
      epoch: '7',
      gas: { computation: '1000000', storage: '2000000', rebate: '500000', budget: '5000000', price: '1000' },
    });
    expect(tx?.balanceChanges[0]).toEqual({ owner: '0xaa', amount: '-100', coinType: '0x2::sui::SUI' });
    expect(tx?.events[0]).toEqual({ sender: '0xaa', type: '0x1::m::E', timestamp: null, json: { v: 1 } });
  });

  it('returns null for a missing transaction', () => {
    expect(mapSuiTransaction(null)).toBeNull();
  });
});

describe('mapSuiObject', () => {
  it('maps owner variants and Move contents', () => {
    const obj = mapSuiObject({
      address: '0x1',
      version: 4,
      digest: 'OD',
      owner: { __typename: 'AddressOwner', address: { address: '0xbeef' } },
      asMoveObject: { contents: { type: { repr: '0x2::coin::Coin<0x2::sui::SUI>' }, json: { balance: '9' } } },
      previousTransaction: { digest: 'PT' },
    });
    expect(obj).toMatchObject({
      objectId: '0x1',
      version: '4',
      owner: { kind: 'address', address: '0xbeef' },
      type: '0x2::coin::Coin<0x2::sui::SUI>',
      fields: { balance: '9' },
      previousTransactionDigest: 'PT',
    });
  });

  it('maps shared and immutable owners', () => {
    expect(mapSuiObject({ address: '0x1', owner: { __typename: 'Shared', initialSharedVersion: 3 } })?.owner).toEqual({
      kind: 'shared',
      initialSharedVersion: '3',
    });
    expect(mapSuiObject({ address: '0x1', owner: { __typename: 'Immutable' } })?.owner).toEqual({ kind: 'immutable' });
  });
});

describe('mapSuiPackage', () => {
  it('lists module names, and is null for non-packages', () => {
    expect(
      mapSuiPackage({ address: '0x2', version: 1, asMovePackage: { modules: { nodes: [{ name: 'coin' }, { name: 'sui' }] } } })
    ).toEqual({ packageId: '0x2', version: '1', modules: ['coin', 'sui'] });
    expect(mapSuiPackage({ address: '0x3', asMovePackage: null })).toBeNull();
  });
});

describe('parseSuiExplorerQuery (slice 2 forms)', () => {
  it('recognises a checkpoint sequence number', () => {
    expect(parseSuiExplorerQuery('410202450')).toEqual({ kind: 'checkpoint', id: '410202450' });
  });

  it('recognises a coin type and pads its address', () => {
    expect(parseSuiExplorerQuery('0x2::sui::SUI')).toEqual({
      kind: 'coin',
      id: `0x${'0'.repeat(63)}2::sui::SUI`,
    });
  });
});

describe('checkpoint, event and coin mappers', () => {
  it('maps a checkpoint with its transactions', () => {
    const cp = mapSuiCheckpoint({
      sequenceNumber: 9,
      digest: 'CD',
      previousCheckpointDigest: 'PD',
      timestamp: '2026-11-20T10:00:00Z',
      networkTotalTransactions: 1000,
      epoch: { epochId: 5 },
      transactions: { nodes: [{ digest: 'T1', sender: { address: '0xa' }, effects: { status: 'FAILURE' } }] },
    });
    expect(cp).toMatchObject({ sequenceNumber: '9', epoch: '5', networkTotalTransactions: '1000', previousDigest: 'PD' });
    expect(cp?.transactions).toEqual([{ digest: 'T1', sender: '0xa', status: 'failed' }]);
  });

  it('maps an event with module, package and tx digest', () => {
    const e = mapSuiEvent({
      sender: { address: '0xs' },
      timestamp: '2026-11-20T10:00:00Z',
      transactionModule: { package: { address: '0xp' }, name: 'store' },
      contents: { type: { repr: '0xp::store::Recorded' }, json: { v: 2 } },
      transaction: { digest: 'TD' },
    });
    expect(e).toEqual({
      sender: '0xs',
      timestamp: '2026-11-20T10:00:00Z',
      eventType: '0xp::store::Recorded',
      moduleName: 'store',
      packageId: '0xp',
      transactionDigest: 'TD',
      json: { v: 2 },
    });
  });

  it('maps coin metadata and treats empty strings as absent', () => {
    expect(mapSuiCoin('0x2::sui::SUI', { address: '0xf', symbol: 'SUI', name: 'Sui', decimals: 9, description: '', iconUrl: '' })).toEqual({
      coinType: '0x2::sui::SUI',
      address: '0xf',
      symbol: 'SUI',
      name: 'Sui',
      decimals: 9,
      description: null,
      iconUrl: null,
    });
    expect(mapSuiCoin('0x1::x::Y', null)).toBeNull();
  });
});
