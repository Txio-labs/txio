import React from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { getStarknetMethod, STARKNET_SPEC_VERSION } from '@/services/starknetMethods';

/**
 * What the selected Starknet method does, its parameters in spec order, and
 * a warning when the method submits a transaction. Renders nothing for a
 * method outside the registry (a custom method the user typed).
 */
export const StarknetMethodInfo: React.FC<{ method: string }> = ({ method }) => {
    const info = getStarknetMethod(method);
    if (!info) return null;
    return (
        <div className="mt-2 space-y-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-xs text-fg-muted">
                <span>{info.summary}</span>
                <span className="font-mono text-fg-subtle">
                    ({info.params.join(', ') || 'no params'})
                </span>
                <a
                    href={info.docs}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-fg-subtle hover:text-fg"
                >
                    Spec {STARKNET_SPEC_VERSION} <ExternalLink size={11} />
                </a>
            </div>
            {!info.readOnly && (
                <div role="note" className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    <span>
                        This submits a signed transaction to the network. It is sent once, to your first endpoint, and never retried: a timeout does not mean
                        it was rejected, so check the transaction hash before sending again.
                    </span>
                </div>
            )}
        </div>
    );
};
