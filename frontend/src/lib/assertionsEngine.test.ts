import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RequestType, Assertion } from '../types';

const { mockPushLog } = vi.hoisted(() => ({
  mockPushLog: vi.fn(),
}));

vi.mock('./store', () => ({
  appStore: { pushLog: mockPushLog },
}));

import { evaluateAssertions, logAssertionResults } from './assertionsEngine';

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
