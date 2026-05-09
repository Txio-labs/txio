import { Assertion, TestOperator } from '../../../types';
import { TestResult } from '../types';

export const runAssertions = (
  tests: Assertion[] = [],
  response: any,
  status?: number,
  error?: string
): TestResult[] => {
  if (!tests.length || (!response && !error && !status)) return [];

  const getByPath = (obj: any, path: string) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  };

  const compare = (actual: any, expected: string | undefined, op: TestOperator) => {
    const strActual = String(actual);
    const strExpected = String(expected || '');
    
    switch(op) {
      case 'equals': return strActual === strExpected;
      case 'not_equals': return strActual !== strExpected;
      case 'contains': return strActual.includes(strExpected);
      case 'greater_than': return Number(actual) > Number(expected);
      case 'less_than': return Number(actual) < Number(expected);
      case 'exists': return actual !== undefined && actual !== null;
      case 'not_exists': return actual === undefined || actual === null;
      default: return false;
    }
  };

  return tests.filter(t => t.enabled).map(test => {
    let passed = false;
    let actualValue: any = undefined;

    try {
      if (test.category === 'response') {
        if (test.target === 'http_status') {
          actualValue = status;
          passed = compare(status, test.value, test.operator);
        } else if (test.target === 'json_path') {
          const [path, expectedVal] = (test.value || '').split('::');
          actualValue = getByPath(response, path);
          passed = compare(actualValue, expectedVal, test.operator);
        } else if (test.target === 'error_message') {
          actualValue = error || response?.error?.message;
          passed = compare(actualValue, test.value, test.operator);
        }
      } 
      else if (test.category === 'transaction') {
        const effects = response?.effects || response?.result?.effects;
        
        if (test.target === 'tx_status') {
          actualValue = effects?.status?.status;
          passed = compare(actualValue, test.value || 'success', test.operator);
        } else if (test.target === 'abort_code') {
          actualValue = effects?.status?.error?.code || effects?.status?.error;
          passed = compare(actualValue, test.value, test.operator);
        } else if (test.target === 'gas_used') {
          actualValue = Number(effects?.gasUsed?.computationCost || 0) + 
                       Number(effects?.gasUsed?.storageCost || 0) - 
                       Number(effects?.gasUsed?.storageRebate || 0);
          passed = compare(actualValue, test.value, test.operator);
        } else if (test.target === 'sender') {
          actualValue = response?.transaction?.data?.sender || response?.result?.transaction?.data?.sender;
          passed = compare(actualValue, test.value, test.operator);
        }
      }
      else if (test.category === 'object') {
        const changes = response?.objectChanges || response?.result?.objectChanges || [];
        const effects = response?.effects || response?.result?.effects;
        
        if (test.target === 'obj_created') {
          const createdIds = changes.filter((c: any) => c.type === 'created').map((c: any) => c.objectId);
          if (!createdIds.length && effects?.created) {
            effects.created.forEach((c: any) => createdIds.push(c.reference.objectId));
          }
          actualValue = createdIds;
          passed = createdIds.includes(test.value || '');
        } else if (test.target === 'obj_mutated') {
          const mutatedIds = changes.filter((c: any) => c.type === 'mutated').map((c: any) => c.objectId);
          if (!mutatedIds.length && effects?.mutated) {
            effects.mutated.forEach((c: any) => mutatedIds.push(c.reference.objectId));
          }
          actualValue = mutatedIds;
          passed = mutatedIds.includes(test.value || '');
        }
      }
      else if (test.category === 'event') {
        const events = response?.events || response?.result?.events || [];
        if (test.target === 'event_any') {
          passed = events.length > 0;
        } else if (test.target === 'event_type') {
          passed = events.some((e: any) => e.type.includes(test.value || ''));
        }
      }
    } catch (e) {
      passed = false;
    }

    return { ...test, passed, actual: actualValue };
  });
};

export const getTransactionDigest = (response: any): string | null => {
  return response?.digest || 
         response?.result?.digest || 
         (typeof response === 'string' && response.startsWith('0x') ? response : null);
};

export const getGasSummary = (response: any) => {
  const effects = response?.effects || response?.result?.effects;
  return effects?.gasUsed || null;
};

export const hasEvents = (response: any): boolean => {
  return !!response?.events || !!response?.result?.events;
};

export const hasEffects = (response: any): boolean => {
  return !!response?.effects || !!response?.result?.effects;
};