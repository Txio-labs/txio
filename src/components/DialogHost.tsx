'use client';

import React, { useSyncExternalStore } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button, Modal, ModalFooter, ModalHeader } from './ui/primitives';
import { PromptModal } from './PromptModal';

/**
 * In-app replacements for window.confirm and window.prompt. Call
 * confirmDialog / promptDialog from anywhere; <DialogHost /> (mounted once in
 * Providers) renders them with the app's own modal styles.
 */

export interface ConfirmOptions {
    title: string;
    description?: React.ReactNode;
    confirmLabel?: string;
    /** Red confirm button, for deletes and other irreversible actions. */
    destructive?: boolean;
}

export interface PromptOptions {
    title: string;
    description?: string;
    label: string;
    initialValue?: string;
    placeholder?: string;
    confirmLabel?: string;
}

type Pending =
    | { kind: 'confirm'; options: ConfirmOptions; resolve: (ok: boolean) => void }
    | { kind: 'prompt'; options: PromptOptions; resolve: (value: string | null) => void };

let current: Pending | null = null;
const listeners = new Set<() => void>();
const set = (next: Pending | null) => {
    current = next;
    listeners.forEach((l) => l());
};

/** Resolves true when the user confirms, false when they cancel or dismiss. */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
    // One dialog at a time: a new one cancels whatever was open.
    if (current) settle(current, null);
    return new Promise((resolve) => set({ kind: 'confirm', options, resolve }));
}

/** Resolves the trimmed value, or null when the user cancels. */
export function promptDialog(options: PromptOptions): Promise<string | null> {
    if (current) settle(current, null);
    return new Promise((resolve) => set({ kind: 'prompt', options, resolve }));
}

function settle(pending: Pending, value: boolean | string | null) {
    if (pending.kind === 'confirm') pending.resolve(value === true);
    else pending.resolve(typeof value === 'string' ? value : null);
    if (current === pending) set(null);
}

export function DialogHost() {
    const pending = useSyncExternalStore(
        (l) => {
            listeners.add(l);
            return () => listeners.delete(l);
        },
        () => current,
        () => null
    );
    if (!pending) return null;

    if (pending.kind === 'prompt') {
        const o = pending.options;
        return (
            <PromptModal
                isOpen
                title={o.title}
                description={o.description}
                label={o.label}
                initialValue={o.initialValue}
                placeholder={o.placeholder}
                confirmLabel={o.confirmLabel}
                onClose={() => settle(pending, null)}
                onSubmit={(value) => settle(pending, value)}
            />
        );
    }

    const o = pending.options;
    return (
        <Modal open onClose={() => settle(pending, false)} width="sm" labelledBy="confirm-dialog-title">
            <ModalHeader
                id="confirm-dialog-title"
                title={o.title}
                description={o.description}
                icon={o.destructive ? <AlertTriangle size={16} className="text-red-600 dark:text-red-400" /> : undefined}
            />
            <ModalFooter>
                <Button variant="ghost" onClick={() => settle(pending, false)}>
                    Cancel
                </Button>
                <Button variant={o.destructive ? 'danger' : 'primary'} onClick={() => settle(pending, true)} autoFocus>
                    {o.confirmLabel ?? 'Confirm'}
                </Button>
            </ModalFooter>
        </Modal>
    );
}
