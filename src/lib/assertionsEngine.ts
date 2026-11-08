import { appStore } from './store';
import { getByPath } from './hooksEngine';
import { Assertion, AssertionResult, RequestType } from '../types';
import type { SimulationSummary } from '../services/transactionService';

export interface AssertionContext {
  requestType: RequestType;
  httpStatus?: number;
  duration?: number;
  error?: string;
  result?: any;
  sender?: string;
  /**
   * The chain-neutral review of a transaction simulation. When present,
   * transaction and event checks read it instead of Sui's raw `effects`, so
   * they mean the same thing on every chain.
   */
  summary?: SimulationSummary;
}

const isEmpty = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  (Array.isArray(value) && value.length === 0) ||
  (typeof value === 'string' && value.trim() === '');

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') return Number.isNaN(value) ? undefined : value;
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return undefined;
};

const stringify = (value: unknown): string => {
  if (value === undefined) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

// Net gas cost the way Sui explorers report it: computation + storage - rebate.
const gasUsedTotal = (gasUsed: any): number | undefined => {
  if (!gasUsed) return undefined;
  const computation = toNumber(gasUsed.computationCost);
  const storage = toNumber(gasUsed.storageCost);
  const rebate = toNumber(gasUsed.storageRebate) ?? 0;
  if (computation === undefined || storage === undefined) return undefined;
  return computation + storage - rebate;
};

/** Whether the chain's simulation reported events/logs at all (an empty list is then a real "none"). */
const eventsReported = (summary: SimulationSummary): boolean =>
  summary.chain === 'sui' || summary.chain === 'aptos' || Boolean(summary.sources.events);

/**
 * `balance_change` value: `ASSET::expected` or `ASSET@ACCOUNT::expected`. The
 * actual value is the signed change in whole units as the review reports it
 * (negative = out, 0 = no change). A change declared by the request rather
 * than simulated does not count.
 */
const balanceChangeActual = (
  summary: SimulationSummary,
  raw: string
): { actual: unknown; expected?: string; note?: string } => {
  // The last `::`: Aptos coin types (0x1::coin::T) contain the separator themselves.
  const sep = raw.lastIndexOf('::');
  const subject = (sep === -1 ? raw : raw.slice(0, sep)).trim();
  const expected = sep === -1 ? undefined : raw.slice(sep + 2).trim();
  const at = subject.indexOf('@');
  const asset = (at === -1 ? subject : subject.slice(0, at)).trim().toLowerCase();
  const account = at === -1 ? '' : subject.slice(at + 1).trim().toLowerCase();
  const declaredOnly = summary.sources.balanceChanges?.includes('not a simulation output');
  if (!summary.balanceChanges || declaredOnly) {
    return { actual: undefined, expected, note: `${summary.chain}'s simulation does not report balance changes` };
  }
  const matches = summary.balanceChanges.filter(
    (c) => c.asset.toLowerCase() === asset && (!account || (c.account ?? '').toLowerCase() === account)
  );
  if (!account && new Set(matches.map((c) => c.account ?? '')).size > 1) {
    return { actual: undefined, expected, note: `several accounts changed ${asset}; name one as ${asset}@<account>` };
  }
  const change = matches[0];
  return { actual: change ? `${change.direction === 'out' ? '-' : ''}${change.amount}` : '0', expected };
};

const compare = (
  actual: unknown,
  operator: Assertion['operator'],
  expected: string | undefined
): boolean => {
  switch (operator) {
    case 'exists':
      return !isEmpty(actual);
    case 'not_exists':
      return isEmpty(actual);
    case 'equals': {
      const actualNum = toNumber(actual);
      const expectedNum = toNumber(expected);
      return actualNum !== undefined && expectedNum !== undefined
        ? actualNum === expectedNum
        : stringify(actual) === (expected ?? '');
    }
    case 'not_equals':
      return !compare(actual, 'equals', expected);
    case 'contains': {
      const needle = expected ?? '';
      return Array.isArray(actual)
        ? actual.some((item) => stringify(item).includes(needle))
        : stringify(actual).includes(needle);
    }
    case 'greater_than': {
      const a = toNumber(actual);
      const e = toNumber(expected);
      return a !== undefined && e !== undefined && a > e;
    }
    case 'less_than': {
      const a = toNumber(actual);
      const e = toNumber(expected);
      return a !== undefined && e !== undefined && a < e;
    }
    default:
      return false;
  }
};

// Extracts the (actual, expected) pair a given assertion target refers to
// from the request execution context. `result` is either the raw JSON-RPC
// result (RPC requests) or a devInspect/execution result carrying `.effects`
// and `.events` (Move call requests) — both are produced by suiService.
const resolveActual = (
  assertion: Assertion,
  ctx: AssertionContext
): { actual: unknown; expected?: string; note?: string } => {
  const { result, summary } = ctx;
  const key = `${assertion.category}:${assertion.target}`;

  if (summary) {
    const unreported = (what: string) => ({ actual: undefined, expected: assertion.value, note: `${summary.chain}'s simulation does not report ${what}` });
    switch (key) {
      case 'transaction:tx_status':
        return { actual: summary.success ? 'success' : 'failure', expected: assertion.value };
      case 'transaction:gas_used':
        return summary.gasUsed === undefined ? unreported('gas used') : { actual: summary.gasUsed, expected: assertion.value };
      case 'transaction:balance_change':
        return balanceChangeActual(summary, assertion.value ?? '');
      case 'event:event_type':
        return eventsReported(summary) ? { actual: summary.events, expected: assertion.value } : unreported('events');
      case 'event:event_any':
        return eventsReported(summary)
          ? { actual: summary.events.length > 0 ? summary.events : undefined, expected: assertion.value }
          : unreported('events');
    }
  }

  switch (key) {
    case 'response:http_status':
      return { actual: ctx.httpStatus, expected: assertion.value };

    case 'response:error_message':
      return { actual: ctx.error, expected: assertion.value };

    case 'response:json_path': {
      const raw = assertion.value ?? '';
      const sep = raw.indexOf('::');
      const path = sep === -1 ? raw : raw.slice(0, sep);
      const expected = sep === -1 ? undefined : raw.slice(sep + 2);
      return { actual: getByPath(result, path.trim()), expected };
    }

    case 'transaction:tx_status': {
      const status =
        getByPath(result, 'effects.status.status') ??
        (ctx.error ? 'failure' : result !== undefined ? 'success' : undefined);
      return { actual: status, expected: assertion.value };
    }

    case 'transaction:abort_code':
      return { actual: getByPath(result, 'effects.status.error'), expected: assertion.value };

    case 'transaction:gas_used':
      return { actual: gasUsedTotal(getByPath(result, 'effects.gasUsed')), expected: assertion.value };

    case 'transaction:sender':
      return { actual: getByPath(result, 'transaction.data.sender') ?? ctx.sender, expected: assertion.value };

    case 'object:obj_created': {
      const created = getByPath(result, 'effects.created') ?? [];
      const ids = (created as any[]).map((c) => c?.reference?.objectId).filter(Boolean);
      return { actual: ids, expected: assertion.value };
    }

    case 'object:obj_mutated': {
      const mutated = getByPath(result, 'effects.mutated') ?? [];
      const ids = (mutated as any[]).map((c) => c?.reference?.objectId).filter(Boolean);
      return { actual: ids, expected: assertion.value };
    }

    case 'object:version': {
      const created = getByPath(result, 'effects.created') ?? [];
      const mutated = getByPath(result, 'effects.mutated') ?? [];
      const first = created[0] ?? mutated[0];
      return { actual: first?.reference?.version, expected: assertion.value };
    }

    case 'event:event_type': {
      const events = getByPath(result, 'events') ?? [];
      const types = (events as any[]).map((e) => e?.type).filter(Boolean);
      return { actual: types, expected: assertion.value };
    }

    case 'event:event_any': {
      const events = (getByPath(result, 'events') ?? []) as any[];
      return { actual: events.length > 0 ? events : undefined, expected: assertion.value };
    }

    case 'transaction:balance_change':
      return { actual: undefined, expected: assertion.value, note: 'balance changes need a simulation review' };

    default:
      return { actual: undefined, expected: assertion.value };
  }
};

const OPERATOR_LABEL: Record<Assertion['operator'], string> = {
  equals: 'equals',
  not_equals: 'does not equal',
  contains: 'contains',
  greater_than: 'is greater than',
  less_than: 'is less than',
  exists: 'exists',
  not_exists: 'does not exist',
};

const describeAssertion = (
  assertion: Assertion,
  actualLabel: string,
  expected: string | undefined,
  note?: string
): string => {
  const verb = OPERATOR_LABEL[assertion.operator];
  const expectation =
    assertion.operator === 'exists' || assertion.operator === 'not_exists'
      ? `${assertion.target} ${verb}`
      : `${assertion.target} ${verb} "${expected ?? ''}"`;
  return `${expectation} (${note ?? `got: ${actualLabel || '∅'}`})`;
};

/** Evaluates a request's enabled assertions against its execution result. */
export const evaluateAssertions = (
  assertions: Assertion[] | undefined,
  ctx: AssertionContext
): AssertionResult[] =>
  (assertions || [])
    .filter((assertion) => assertion.enabled)
    .map((assertion) => {
      const { actual, expected, note } = resolveActual(assertion, ctx);
      // A section the simulation did not report can't satisfy any check, not even "does not exist".
      const passed = note === undefined && compare(actual, assertion.operator, expected);
      const actualLabel = stringify(actual);

      return {
        id: assertion.id,
        category: assertion.category,
        target: assertion.target,
        operator: assertion.operator,
        expected,
        actual: actualLabel,
        passed,
        message: describeAssertion(assertion, actualLabel, expected, note),
      };
    });

/** Writes assertion outcomes to the activity log/terminal, mirroring logCommandToTerminal's style. */
export const logAssertionResults = (results: AssertionResult[], target: string): void => {
  if (!results.length) return;

  results.forEach((r) => {
    appStore.pushLog(`${r.passed ? '✓' : '✗'} ${r.message}`, target, r.passed ? 'system' : 'error');
  });

  const passedCount = results.filter((r) => r.passed).length;
  appStore.pushLog(
    `Tests: ${passedCount}/${results.length} passed`,
    target,
    passedCount === results.length ? 'system' : 'error'
  );
};
