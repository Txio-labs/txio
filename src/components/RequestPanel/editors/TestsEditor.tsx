import React from 'react';
import { Plus, X, Beaker, CheckCircle2, XCircle } from 'lucide-react';
import { Select } from '../../Select';
import { Assertion, AssertionResult, TestCategory, TestOperator } from '../../../types';
import { appStore } from '@/lib/store';

interface TestsEditorProps {
  tests: Assertion[];
  onChange: (tests: Assertion[]) => void;
  results?: AssertionResult[];
}

/**
 * `subject::expected` for JSON-path and balance-change checks. A balance
 * subject splits on the last `::`, since Aptos coin types contain it.
 */
const splitTwoPart = (target: string, value: string | undefined): [string, string] => {
  const raw = value ?? '';
  const sep = target === 'balance_change' ? raw.lastIndexOf('::') : raw.indexOf('::');
  return sep === -1 ? [raw, ''] : [raw.slice(0, sep), raw.slice(sep + 2)];
};

export const TestsEditor: React.FC<TestsEditorProps> = ({ tests = [], onChange, results = [] }) => {
  const resultsById = new Map(results.map((r) => [r.id, r]));
  const addTest = () => {
    const newTest: Assertion = {
      id: Date.now().toString(),
      category: 'response',
      target: 'http_status',
      operator: 'equals',
      value: '200',
      enabled: true
    };
    onChange([...tests, newTest]);
  };

  const updateTest = (index: number, updates: Partial<Assertion>) => {
    const newTests = [...tests];
    newTests[index] = { ...newTests[index], ...updates };
    onChange(newTests);
  };

  const removeTest = (index: number) => {
    const newTests = tests.filter((_, i) => i !== index);
    onChange(newTests);
  };

  const getFieldsForCategory = (cat: TestCategory) => {
    switch(cat) {
      case 'response': return [
        { label: 'HTTP Status', value: 'http_status' },
        { label: 'JSON Body Path', value: 'json_path' },
        { label: 'Error Message', value: 'error_message' }
      ];
      case 'transaction': return [
        { label: 'Status (Success/Fail)', value: 'tx_status' },
        { label: 'Abort Code', value: 'abort_code' },
        { label: 'Gas Used', value: 'gas_used' },
        { label: 'Balance Change', value: 'balance_change' },
        { label: 'Sender Address', value: 'sender' }
      ];
      case 'object': return [
        { label: 'Object Created (ID)', value: 'obj_created' },
        { label: 'Object Mutated (ID)', value: 'obj_mutated' },
        { label: 'Version', value: 'version' }
      ];
      case 'event': return [
        { label: 'Event Type Emitted', value: 'event_type' },
        { label: 'Any Event Emitted', value: 'event_any' }
      ];
      default: return [];
    }
  };

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-sm font-semibold text-fg">Assertions</h3>
          <p className="text-xs text-fg-subtle mt-1">
            Define rules to automatically validate the execution result.
          </p>
        </div>
        <button 
          onClick={addTest}
          className="text-xs font-semibold flex items-center gap-1.5 bg-inverse hover:opacity-90 text-on-inverse px-3 py-1.5 rounded transition-colors"
        >
          <Plus size={12} strokeWidth={3}/> Add Test
        </button>
      </div>

      {results.length > 0 && (
        <div
          className={`mb-4 text-xs font-semibold px-3 py-2 rounded-lg border ${
            results.every((r) => r.passed)
              ? 'text-emerald-600 dark:text-emerald-400 border-emerald-900/30 bg-emerald-900/10'
              : 'text-red-600 dark:text-red-400 border-red-900/30 bg-red-900/10'
          }`}
        >
          {results.filter((r) => r.passed).length}/{results.length} assertions passed on last run
        </div>
      )}

      <div className="space-y-3">
        {tests.map((test, idx) => {
          const result = resultsById.get(test.id);
          return (
          <div key={test.id} className="group flex items-start gap-3 p-3 bg-elevated border border-line rounded-lg hover:border-line-strong transition-all">
            <div className="pt-2">
              <input
                type="checkbox"
                checked={test.enabled}
                onChange={() => updateTest(idx, { enabled: !test.enabled })}
                className="accent-zinc-500 cursor-pointer"
              />
            </div>

            {result && (
              <div className="pt-2" title={result.message}>
                {result.passed ? (
                  <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <XCircle size={14} className="text-red-600 dark:text-red-400" />
                )}
              </div>
            )}

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Category */}
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-fg-muted uppercase block mb-1">Subject</label>
                <Select 
                  className="w-full"
                  value={test.category}
                  options={[
                    { label: 'Response', value: 'response' },
                    { label: 'Transaction', value: 'transaction' },
                    { label: 'Object', value: 'object' },
                    { label: 'Event', value: 'event' }
                  ]}
                  onChange={(val) => {
                    const cat = val as TestCategory;
                    const fields = getFieldsForCategory(cat);
                    updateTest(idx, { category: cat, target: fields[0].value });
                  }}
                  size="xs"
                  variant="outline"
                  fullWidth
                />
              </div>

              {/* Target Field */}
              <div className="sm:col-span-3">
                <label className="text-xs font-medium text-fg-muted uppercase block mb-1">Property</label>
                <Select 
                  className="w-full"
                  value={test.target}
                  options={getFieldsForCategory(test.category).map(f => ({ label: f.label, value: f.value }))}
                  onChange={(val) => updateTest(idx, { target: val })}
                  size="xs"
                  variant="outline"
                  fullWidth
                />
              </div>

              {/* Operator */}
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-fg-muted uppercase block mb-1">Condition</label>
                <Select 
                  className="w-full"
                  value={test.operator}
                  options={[
                    { label: 'Equals', value: 'equals' },
                    { label: 'Not Equals', value: 'not_equals' },
                    { label: 'Contains', value: 'contains' },
                    { label: 'Greater Than', value: 'greater_than' },
                    { label: 'Less Than', value: 'less_than' },
                    { label: 'Exists', value: 'exists' },
                    { label: 'Does Not Exist', value: 'not_exists' }
                  ]}
                  onChange={(val) => updateTest(idx, { operator: val as TestOperator })}
                  size="xs"
                  variant="outline"
                  fullWidth
                />
              </div>

              {/* Expected Value */}
              <div className="sm:col-span-5">
                <label className="text-xs font-medium text-fg-muted uppercase block mb-1">
                  {test.target === 'json_path'
                    ? 'Key Path (e.g. result.digest)'
                    : test.target === 'balance_change'
                      ? 'Asset@account, signed change (e.g. APT@0x1…, -0.5)'
                      : 'Expected Value'}
                </label>
                <div className="flex gap-2">
                  {(test.target === 'json_path' || test.target === 'balance_change') && (
                    <input 
                      placeholder={test.target === 'balance_change' ? 'APT@0x…' : 'Path...'}
                      aria-label={test.target === 'balance_change' ? 'Asset and account' : 'Key path'} 
                      className="w-1/2 bg-surface border border-line rounded px-2 py-1.5 text-xs text-fg font-mono outline-none focus:border-line-strong"
                      value={splitTwoPart(test.target, test.value)[0]}
                      onChange={(e) => {
                        const val = splitTwoPart(test.target, test.value)[1];
                        updateTest(idx, { value: `${e.target.value}::${val}` });
                      }}
                    />
                  )}
                  <input 
                    placeholder={test.operator === 'exists' ? 'N/A' : 'Value...'}
                    disabled={test.operator === 'exists' || test.operator === 'not_exists'}
                    className={`flex-1 bg-surface border border-line rounded px-2 py-1.5 text-xs text-fg font-mono outline-none focus:border-line-strong ${test.target === 'json_path' || test.target === 'balance_change' ? 'w-1/2' : 'w-full'}`}
                    value={test.target === 'json_path' || test.target === 'balance_change' ? splitTwoPart(test.target, test.value)[1] : (test.value || '')}
                    onChange={(e) => {
                      if (test.target === 'json_path' || test.target === 'balance_change') {
                        const path = splitTwoPart(test.target, test.value)[0];
                        updateTest(idx, { value: `${path}::${e.target.value}` });
                      } else {
                        updateTest(idx, { value: e.target.value });
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            <button onClick={() => removeTest(idx)} aria-label="Remove test" title="Remove test" className="mt-6 text-fg-muted hover:text-red-400 p-1 transition-colors">
              <X size={14}/>
            </button>
          </div>
          );
        })}
        {tests.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-line rounded-[10px] bg-hover">
            <Beaker size={32} className="mx-auto text-fg-muted mb-3" />
            <p className="text-sm font-semibold text-fg-subtle">No tests defined</p>
            <p className="text-xs text-fg-muted mt-1 max-w-sm mx-auto">
              Add tests to verify transaction status, gas usage, events, or specific data fields in the response.
            </p>
            <button onClick={addTest} className="mt-4 text-xs font-semibold text-fg hover:opacity-80">
              + Create your first test
            </button>
          </div>
        )}
      </div>
    </div>
  );
};