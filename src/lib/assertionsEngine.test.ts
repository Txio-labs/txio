import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RequestType, Assertion } from '../types';

const { mockPushLog } = vi.hoisted(() => ({
  mockPushLog: vi.fn(),
}));

vi.mock('./store', () => ({
  appStore: { pushLog: mockPushLog },
}));

import { evaluateAssertions, logAssertionResults } from './assertionsEngine';
import type { SimulationSummary } from '../services/transactionService';

const assertion = (overrides: Partial<Assertion>): Assertion => ({
  id: overrides.id ?? 'a1',
  category: 'response',
  target: 'http_status',
  operator: 'equals',
  value: '200',
  enabled: true,
  ...overrides,
});

describe('evaluateAssertions', () => {
  beforeEach(() => {
    mockPushLog.mockClear();
  });

  it('returns nothing for undefined or disabled assertions', () => {
    expect(evaluateAssertions(undefined, { requestType: RequestType.RPC })).toEqual([]);
    expect(
      evaluateAssertions([assertion({ enabled: false })], { requestType: RequestType.RPC, httpStatus: 200 })
    ).toEqual([]);
  });

  it('passes an http_status equals assertion when statuses match', () => {
    const [result] = evaluateAssertions([assertion({})], { requestType: RequestType.RPC, httpStatus: 200 });
    expect(result.passed).toBe(true);
  });

  it('fails an http_status equals assertion when statuses differ', () => {
    const [result] = evaluateAssertions([assertion({})], { requestType: RequestType.RPC, httpStatus: 500 });
    expect(result.passed).toBe(false);
  });

  it('evaluates a json_path assertion against the RPC result', () => {
    const [result] = evaluateAssertions(
      [assertion({ category: 'response', target: 'json_path', value: 'result.digest::abc123' })],
      { requestType: RequestType.RPC, result: { result: { digest: 'abc123' } } }
    );
    expect(result.passed).toBe(true);
  });

  it('evaluates transaction status from devInspect-shaped effects', () => {
    const [result] = evaluateAssertions(
      [assertion({ category: 'transaction', target: 'tx_status', value: 'success' })],
      {
        requestType: RequestType.TRANSACTION,
        result: { effects: { status: { status: 'success' } } },
      }
    );
    expect(result.passed).toBe(true);
  });

  it('treats a request error as tx_status failure', () => {
    const [result] = evaluateAssertions(
      [assertion({ category: 'transaction', target: 'tx_status', value: 'failure' })],
      { requestType: RequestType.TRANSACTION, error: 'boom' }
    );
    expect(result.passed).toBe(true);
  });

  it('sums gas_used net of the storage rebate', () => {
    const [result] = evaluateAssertions(
      [assertion({ category: 'transaction', target: 'gas_used', operator: 'less_than', value: '1000' })],
      {
        requestType: RequestType.TRANSACTION,
        result: {
          effects: { gasUsed: { computationCost: '500', storageCost: '400', storageRebate: '200' } },
        },
      }
    );
    // 500 + 400 - 200 = 700 < 1000
    expect(result.passed).toBe(true);
  });

  it('checks obj_created contains a specific object id', () => {
    const [result] = evaluateAssertions(
      [assertion({ category: 'object', target: 'obj_created', operator: 'contains', value: '0xabc' })],
      {
        requestType: RequestType.TRANSACTION,
        result: { effects: { created: [{ reference: { objectId: '0xabc' } }] } },
      }
    );
    expect(result.passed).toBe(true);
  });

  it('checks event_any exists', () => {
    const [result] = evaluateAssertions(
      [assertion({ category: 'event', target: 'event_any', operator: 'exists' })],
      { requestType: RequestType.TRANSACTION, result: { events: [{ type: 'X::Y::Z' }] } }
    );
    expect(result.passed).toBe(true);
  });

  it('fails event_any exists when there are no events', () => {
    const [result] = evaluateAssertions(
      [assertion({ category: 'event', target: 'event_any', operator: 'exists' })],
      { requestType: RequestType.TRANSACTION, result: { events: [] } }
    );
    expect(result.passed).toBe(false);
  });
});

describe('evaluateAssertions with a simulation review', () => {
  const review = (overrides: Partial<SimulationSummary> = {}): SimulationSummary => ({
    chain: 'aptos',
    success: true,
    fee: '0.0001 APT',
    gasUsed: 1500,
    touched: [],
    events: ['0x1::coin::CoinWithdraw', '0x1::coin::CoinDeposit'],
    balanceChanges: [
      { asset: 'APT', amount: '0.05', direction: 'out', account: '0xA' },
      { asset: 'APT', amount: '0.05', direction: 'in', account: '0xB' },
      { asset: '0x1::fa::USDC', amount: '7', direction: 'in', account: '0xB' },
    ],
    sources: { balanceChanges: 'framework coin events' },
    warnings: [],
    raw: {},
    ...overrides,
  });
  const run = (a: Partial<Assertion>, summary: SimulationSummary) =>
    evaluateAssertions([assertion(a)], { requestType: RequestType.TRANSACTION, result: summary.raw, summary })[0];

  it('reads status, gas and events from the review on any chain, not Sui effects', () => {
    expect(run({ category: 'transaction', target: 'tx_status', value: 'success' }, review()).passed).toBe(true);
    expect(run({ category: 'transaction', target: 'tx_status', value: 'success' }, review({ success: false })).passed).toBe(false);
    expect(run({ category: 'transaction', target: 'gas_used', operator: 'less_than', value: '2000' }, review()).passed).toBe(true);
    expect(run({ category: 'event', target: 'event_type', operator: 'contains', value: 'CoinDeposit' }, review()).passed).toBe(true);
  });

  it('checks a signed balance change per asset and account', () => {
    const balance = (value: string, summary = review()) =>
      run({ category: 'transaction', target: 'balance_change', value }, summary);
    expect(balance('APT@0xa::-0.05').passed).toBe(true);
    expect(balance('apt@0xB::0.05').passed).toBe(true);
    expect(balance('APT@0xC::0').passed).toBe(true);
    expect(balance('0x1::fa::USDC@0xB::7').passed).toBe(true);
    expect(balance('APT@0xA::0.05').message).toContain('got: -0.05');
    const ambiguous = balance('APT::-0.05');
    expect(ambiguous.passed).toBe(false);
    expect(ambiguous.message).toContain('several accounts changed apt');
  });

  it('fails a check on a section the chain did not report, whatever the operator', () => {
    const evm = review({ chain: 'evm', gasUsed: undefined, balanceChanges: undefined, events: [], sources: {} });
    for (const a of [
      { category: 'transaction' as const, target: 'gas_used', operator: 'not_exists' as const },
      { category: 'transaction' as const, target: 'balance_change', value: 'ETH@0x1::0' },
      { category: 'event' as const, target: 'event_any', operator: 'not_exists' as const },
    ]) {
      const result = run(a, evm);
      expect(result.passed).toBe(false);
      expect(result.message).toContain("evm's simulation does not report");
    }
  });

  it('does not count a value the request declared as a simulated balance change', () => {
    const declared = review({
      chain: 'evm',
      balanceChanges: [{ asset: 'ETH', amount: '1', direction: 'out' }],
      sources: { balanceChanges: 'transaction value (not a simulation output)' },
    });
    expect(run({ category: 'transaction', target: 'balance_change', value: 'ETH::-1' }, declared).passed).toBe(false);
  });
});

describe('logAssertionResults', () => {
  beforeEach(() => {
    mockPushLog.mockClear();
  });

  it('does nothing when there are no results', () => {
    logAssertionResults([], 'testnet');
    expect(mockPushLog).not.toHaveBeenCalled();
  });

  it('logs each result plus a summary line', () => {
    const results = evaluateAssertions([assertion({})], { requestType: RequestType.RPC, httpStatus: 200 });
    logAssertionResults(results, 'testnet');
    expect(mockPushLog).toHaveBeenCalledTimes(2);
    expect(mockPushLog).toHaveBeenLastCalledWith('Tests: 1/1 passed', 'testnet', 'system');
  });
});
