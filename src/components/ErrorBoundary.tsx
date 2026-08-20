'use client';

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onReset?: () => void;
    /** Context label shown in the fallback UI for debugging */
    contextLabel?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(
            `[ErrorBoundary${this.props.contextLabel ? `: ${this.props.contextLabel}` : ''}]`,
            error,
            errorInfo.componentStack,
        );
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        this.props.onReset?.();
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] p-6 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                        <AlertTriangle size={20} />
                    </div>
                    <p className="mt-4 text-sm font-medium text-white">
                        Something went wrong
                        {this.props.contextLabel
                            ? ` in ${this.props.contextLabel}`
                            : ''}
                    </p>
                    <p className="mt-1 max-w-sm text-xs text-slate-400">
                        {this.state.error?.message || 'An unexpected error occurred.'}
                    </p>
                    <button
                        onClick={this.handleReset}
                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-electric-violet/20 px-4 py-2 text-xs font-semibold text-electric-violet transition-colors hover:bg-electric-violet/30"
                    >
                        <RefreshCw size={13} />
                        Try again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
