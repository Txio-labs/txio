import React from 'react';
import { Plus, X, Workflow } from 'lucide-react';
import { Select } from '../../Select';
import { Hook } from '../../../types';

interface HooksEditorProps {
  hooks: Hook[];
  onChange: (hooks: Hook[]) => void;
}

const ACTION_OPTIONS: { label: string; value: Hook['action'] }[] = [
  { label: 'Fetch fresh object', value: 'fetch_object' },
  { label: 'Set env variable', value: 'set_env' },
  { label: 'Clear env variable', value: 'cleanup' }
];

const HookList: React.FC<{
  type: 'pre' | 'post';
  hooks: Hook[];
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<Hook>) => void;
  onRemove: (id: string) => void;
}> = ({ type, hooks, onAdd, onUpdate, onRemove }) => {
  const rows = hooks.filter((h) => h.type === type);
  const helpText =
    type === 'pre'
      ? 'Run before the request executes (e.g. fetch a fresh object ID into an env var).'
      : 'Run after the request executes (e.g. store a returned object ID to an env var).';

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-fg">
          {type === 'pre' ? 'Pre-Run Hooks' : 'Post-Run Hooks'}
        </h3>
        <button
          onClick={onAdd}
          className="flex items-center gap-1 text-xs text-fg hover:text-fg"
        >
          <Plus size={12} /> Add
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="bg-surface border border-line rounded-lg p-4 text-xs text-fg-subtle italic">
          {helpText}
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((hook) => (
            <div
              key={hook.id}
              className="group flex items-start gap-3 p-3 bg-elevated border border-line rounded-lg hover:border-line-strong transition-all"
            >
              <div className="pt-2">
                <input
                  type="checkbox"
                  checked={hook.enabled}
                  onChange={() => onUpdate(hook.id, { enabled: !hook.enabled })}
                  className="accent-zinc-500 cursor-pointer"
                />
              </div>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-3">
                  <label className="text-xs font-medium text-fg-muted uppercase block mb-1">
                    Action
                  </label>
                  <Select
                    className="w-full"
                    value={hook.action}
                    options={ACTION_OPTIONS}
                    onChange={(val) => onUpdate(hook.id, { action: val as Hook['action'] })}
                    size="xs"
                    variant="outline"
                    fullWidth
                  />
                </div>

                {hook.action !== 'cleanup' ? (
                  <div className="sm:col-span-4">
                    <label className="text-xs font-medium text-fg-muted uppercase block mb-1">
                      Env Variable Key
                    </label>
                    <input
                      placeholder="e.g. LATEST_OBJECT_ID"
                      className="w-full bg-surface border border-line rounded px-2 py-1.5 text-xs text-fg font-mono outline-none focus:border-line-strong"
                      value={hook.key || ''}
                      onChange={(e) => onUpdate(hook.id, { key: e.target.value })}
                    />
                  </div>
                ) : (
                  <div className="sm:col-span-4">
                    <label className="text-xs font-medium text-fg-muted uppercase block mb-1">
                      Env Variable To Clear
                    </label>
                    <input
                      placeholder="e.g. LATEST_OBJECT_ID"
                      className="w-full bg-surface border border-line rounded px-2 py-1.5 text-xs text-fg font-mono outline-none focus:border-line-strong"
                      value={hook.key || ''}
                      onChange={(e) => onUpdate(hook.id, { key: e.target.value })}
                    />
                  </div>
                )}

                {hook.action !== 'cleanup' && (
                  <div className="sm:col-span-5">
                    <label className="text-xs font-medium text-fg-muted uppercase block mb-1">
                      {hook.action === 'fetch_object'
                        ? 'Object ID To Refresh'
                        : type === 'post'
                        ? 'Response Path (e.g. effects.created.0.reference.objectId)'
                        : 'Value'}
                    </label>
                    <input
                      placeholder={hook.action === 'fetch_object' ? '0x...' : 'path or literal value'}
                      className="w-full bg-surface border border-line rounded px-2 py-1.5 text-xs text-fg font-mono outline-none focus:border-line-strong"
                      value={hook.value || ''}
                      onChange={(e) => onUpdate(hook.id, { value: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <button
                onClick={() => onRemove(hook.id)}
                className="mt-1 text-fg-muted hover:text-red-400 p-1 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const HooksEditor: React.FC<HooksEditorProps> = ({ hooks = [], onChange }) => {
  const addHook = (type: 'pre' | 'post') => {
    const newHook: Hook = {
      id: `hook-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      action: type === 'pre' ? 'fetch_object' : 'set_env',
      key: '',
      value: '',
      enabled: true
    };
    onChange([...hooks, newHook]);
  };

  const updateHook = (id: string, updates: Partial<Hook>) => {
    onChange(hooks.map((h) => (h.id === id ? { ...h, ...updates } : h)));
  };

  const removeHook = (id: string) => {
    onChange(hooks.filter((h) => h.id !== id));
  };

  return (
    <div className="p-4 md:p-6 w-full space-y-8">
      <div className="flex items-center gap-2 text-fg-subtle">
        <Workflow size={14} />
        <p className="text-xs">
          Hooks run against your active environment variables — no scripting required.
        </p>
      </div>

      <HookList
        type="pre"
        hooks={hooks}
        onAdd={() => addHook('pre')}
        onUpdate={updateHook}
        onRemove={removeHook}
      />

      <HookList
        type="post"
        hooks={hooks}
        onAdd={() => addHook('post')}
        onUpdate={updateHook}
        onRemove={removeHook}
      />
    </div>
  );
};