import { appStore } from './store';
import { getObject } from '../services/suiService';
import { Hook, EnvironmentVariable, Network } from '../types';

const getByPath = (obj: any, path: string): any =>
  path
    .split('.')
    .map((k) => k.trim())
    .filter(Boolean)
    .reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);

const upsertEnvVar = (
  vars: EnvironmentVariable[],
  key: string,
  value: string
): EnvironmentVariable[] => {
  const idx = vars.findIndex((v) => v.key === key);
  if (idx === -1) {
    return [...vars, { key, value, enabled: true, network: 'all' }];
  }
  const next = [...vars];
  next[idx] = { ...next[idx], value };
  return next;
};

const removeEnvVarByKey = (
  vars: EnvironmentVariable[],
  key: string
): EnvironmentVariable[] => vars.filter((v) => v.key !== key);

/**
 * Runs the request's pre- or post-run hooks and persists any resulting
 * environment variable changes to the store.
 *
 * `result` is the RPC/simulation result available to post-run hooks
 * (e.g. so `set_env` can pull `effects.created.0.reference.objectId` out
 * of a Move call response).
 */
export const runHooks = async (
  hooks: Hook[] | undefined,
  phase: 'pre' | 'post',
  network: Network,
  result?: unknown
): Promise<void> => {
  const active = (hooks || []).filter((h) => h.enabled && h.type === phase);
  if (!active.length) return;

  let vars = appStore.getSnapshot().envVariables;

  for (const hook of active) {
    try {
      switch (hook.action) {
        case 'fetch_object': {
          if (!hook.value) break;
          const { result: objRes } = await getObject(network, hook.value);
          const objectId = objRes?.data?.objectId ?? hook.value;
          if (hook.key) vars = upsertEnvVar(vars, hook.key, objectId);
          break;
        }
        case 'set_env': {
          if (!hook.key) break;
          const resolvedValue =
            phase === 'post' && hook.value
              ? getByPath(result, hook.value)
              : hook.value;
          if (resolvedValue !== undefined) {
            vars = upsertEnvVar(
              vars,
              hook.key,
              typeof resolvedValue === 'string'
                ? resolvedValue
                : JSON.stringify(resolvedValue)
            );
          }
          break;
        }
        case 'cleanup': {
          if (hook.key) vars = removeEnvVarByKey(vars, hook.key);
          break;
        }
      }
    } catch (err) {
      appStore.pushLog(
        `${phase === 'pre' ? 'Pre-run' : 'Post-run'} hook "${hook.action}" failed: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`,
        'cli',
        'error'
      );
    }
  }

  appStore.updateEnv(vars);
};
