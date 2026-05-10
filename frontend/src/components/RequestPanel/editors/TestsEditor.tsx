import React from 'react';
import { Plus, X, Beaker } from 'lucide-react';
import { Select } from '../../Select';
import { Assertion, TestCategory, TestOperator } from '../../../types';
import { appStore } from '@/lib/store';

interface TestsEditorProps {
  tests: Assertion[];
  onChange: (tests: Assertion[]) => void;
}

export const TestsEditor: React.FC<TestsEditorProps> = ({ tests = [], onChange }) => {
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
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-sm font-bold text-slate-200">Assertions</h3>
          <p className="text-xs text-slate-500 mt-1">
            Define rules to automatically validate the execution result.
          </p>
        </div>
        <button 
          onClick={addTest}
          className="text-xs font-bold flex items-center gap-1.5 bg-sui-600 hover:bg-sui-500 text-white px-3 py-1.5 rounded transition-colors"
        >
          <Plus size={12} strokeWidth={3}/> Add Test
        </button>
      </div>
      
      <div className="space-y-3">
        {tests.map((test, idx) => (
          <div key={test.id} className="group flex items-start gap-3 p-3 bg-[#0a0a0a] border border-white/10 rounded-lg hover:border-white/20 transition-all">
            <div className="pt-2">
              <input 
                type="checkbox" 
                checked={test.enabled} 
                onChange={() => updateTest(idx, { enabled: !test.enabled })} 
                className="accent-sui-500 cursor-pointer"
              />
            </div>
            
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Category */}
              <div className="sm:col-span-2">
                <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Subject</label>
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
                <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Property</label>
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
                <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Condition</label>
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
                <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">
                  {test.target === 'json_path' ? 'Key Path (e.g. result.digest)' : 'Expected Value'}
                </label>
                <div className="flex gap-2">
                  {test.target === 'json_path' && (
                    <input 
                      placeholder="Path..." 
                      className="w-1/2 bg-[#111] border border-white/10 rounded px-2 py-1.5 text-xs text-sui-400 font-mono outline-none focus:border-sui-500"
                      value={test.value?.split('::')[0] || ''}
                      onChange={(e) => {
                        const val = test.value?.split('::')[1] || '';
                        updateTest(idx, { value: `${e.target.value}::${val}` });
                      }}
                    />
                  )}
                  <input 
                    placeholder={test.operator === 'exists' ? 'N/A' : 'Value...'}
                    disabled={test.operator === 'exists' || test.operator === 'not_exists'}
                    className={`flex-1 bg-[#111] border border-white/10 rounded px-2 py-1.5 text-xs text-white font-mono outline-none focus:border-sui-500 ${test.target === 'json_path' ? 'w-1/2' : 'w-full'}`}
                    value={test.target === 'json_path' ? (test.value?.split('::')[1] || '') : (test.value || '')}
                    onChange={(e) => {
                      if (test.target === 'json_path') {
                        const path = test.value?.split('::')[0] || '';
                        updateTest(idx, { value: `${path}::${e.target.value}` });
                      } else {
                        updateTest(idx, { value: e.target.value });
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            <button onClick={() => removeTest(idx)} className="mt-6 text-slate-600 hover:text-red-400 p-1 transition-colors">
              <X size={14}/>
            </button>
          </div>
        ))}
        {tests.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl bg-white/[0.02]">
            <Beaker size={32} className="mx-auto text-slate-600 mb-3" />
            <p className="text-sm font-bold text-slate-400">No tests defined</p>
            <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
              Add tests to verify transaction status, gas usage, events, or specific data fields in the response.
            </p>
            <button onClick={addTest} className="mt-4 text-xs font-bold text-sui-400 hover:text-sui-300">
              + Create your first test
            </button>
          </div>
        )}
      </div>
    </div>
  );
};