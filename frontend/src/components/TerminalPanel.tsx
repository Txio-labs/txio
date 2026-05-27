
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, X, Filter, Trash2, Command, Square } from 'lucide-react';
import { useAppStore, appStore } from '@/lib/store';
import { apiService, CommandExecutionResponse } from '@/services/api';

const POLL_INTERVAL_MS = 500;

const TERMINAL_HEIGHT_STORAGE_KEY = 'txio_terminal_height';
const DEFAULT_TERMINAL_HEIGHT = 256;
const MIN_TERMINAL_HEIGHT = 120;
const MAX_TERMINAL_HEIGHT_INSET = 120; // px of viewport to leave above the terminal

const getInitialTerminalHeight = (): number => {
    if (typeof window === 'undefined') return DEFAULT_TERMINAL_HEIGHT;
    const stored = window.localStorage.getItem(TERMINAL_HEIGHT_STORAGE_KEY);
    if (!stored) return DEFAULT_TERMINAL_HEIGHT;
    const parsed = Number.parseInt(stored, 10);
    if (!Number.isFinite(parsed) || parsed < MIN_TERMINAL_HEIGHT) return DEFAULT_TERMINAL_HEIGHT;
    return parsed;
};

export const TerminalPanel: React.FC = () => {
    const { activityLogs, isTerminalOpen } = useAppStore();
    const [input, setInput] = useState('');
    const [isExecuting, setIsExecuting] = useState(false);
    const [pendingCommand, setPendingCommand] = useState<string | null>(null);
    const [pendingExecutionId, setPendingExecutionId] = useState<string | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [showErrorsOnly, setShowErrorsOnly] = useState(false);
    const [terminalHeight, setTerminalHeight] = useState<number>(getInitialTerminalHeight);
    const [isDragging, setIsDragging] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const executionIdRef = useRef<string | null>(null);
    const isMountedRef = useRef(true);
    const dragStartRef = useRef<{ startY: number; startHeight: number } | null>(null);

    const handleResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        dragStartRef.current = { startY: e.clientY, startHeight: terminalHeight };
        setIsDragging(true);
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handleResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragStartRef.current) return;
        const delta = dragStartRef.current.startY - e.clientY;
        const maxHeight = Math.max(MIN_TERMINAL_HEIGHT, window.innerHeight - MAX_TERMINAL_HEIGHT_INSET);
        const next = Math.max(
            MIN_TERMINAL_HEIGHT,
            Math.min(dragStartRef.current.startHeight + delta, maxHeight),
        );
        setTerminalHeight(next);
    };

    const handleResizeEnd = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragStartRef.current) return;
        dragStartRef.current = null;
        setIsDragging(false);
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
        try {
            window.localStorage.setItem(TERMINAL_HEIGHT_STORAGE_KEY, String(terminalHeight));
        } catch {
            // ignore quota errors
        }
    };

    const focusInput = () => {
        if (!isExecuting) {
            inputRef.current?.focus();
        }
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [activityLogs, showErrorsOnly]);

    useEffect(() => {
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;
            if (executionIdRef.current) {
                void apiService
                    .cancelCommandExecution(
                        executionIdRef.current
                    )
                    .catch(() => undefined);
            }
        };
    }, []);

    const visibleLogs = (showErrorsOnly
        ? activityLogs.filter(
              (log) => log.type === 'error'
          )
        : activityLogs
    )
        .slice()
        // The store prepends new logs, but the terminal should still read top-to-bottom.
        .reverse();

    const clearLogs = () => {
        appStore.clearActivityLogs();
        appStore.showToast('Terminal cleared', 'info');
    };

    const sleep = (ms: number) =>
        new Promise((resolve) => {
            setTimeout(resolve, ms);
        });

    const resetExecutionState = () => {
        executionIdRef.current = null;

        if (isMountedRef.current) {
            setPendingExecutionId(null);
            setPendingCommand(null);
            setIsExecuting(false);
            setIsCancelling(false);
        }
    };

    const firstMeaningfulOutput = (
        ...values: Array<
            string | null | undefined
        >
    ) => {
        for (const value of values) {
            if (
                typeof value ===
                    'string' &&
                value.trim()
            ) {
                return value;
            }
        }

        return null;
    };

    const pushExecutionResult = (
        result: CommandExecutionResponse
    ) => {
        const primaryOutput =
            firstMeaningfulOutput(
                result.output,
                result.stderr,
                result.stdout
            ) ||
            (result.state ===
            'cancelled'
                ? `Command cancelled: ${result.command}`
                : result.state ===
                    'timed_out'
                  ? `Command timed out: ${result.command}`
                  : result.state ===
                      'error'
                    ? 'Command failed.'
                    : 'Command completed without output.');
        const logType =
            result.state === 'success' ||
            result.state === 'cancelled'
                ? 'system'
                : 'error';
        const summaryBits: string[] = [];

        if (
            typeof result.durationMs ===
            'number'
        ) {
            summaryBits.push(
                `${result.durationMs}ms`
            );
        }

        if (
            typeof result.exitCode ===
            'number'
        ) {
            summaryBits.push(
                `exit ${result.exitCode}`
            );
        }

        appStore.pushLog(
            primaryOutput,
            'cli',
            logType
        );

        if (summaryBits.length > 0) {
            appStore.pushLog(
                `${result.state.replace('_', ' ')} · ${summaryBits.join(' · ')}`,
                'cli',
                logType
            );
        }

        if (
            result.state === 'success' &&
            result.command
                .toLowerCase()
                .includes('deploy')
        ) {
            appStore.showToast(
                'Package deployed',
                'success'
            );
        }
    };

    const pollExecution = async (
        executionId: string
    ) => {
        let failedPolls = 0;

        while (
            isMountedRef.current &&
            executionIdRef.current ===
                executionId
        ) {
            try {
                const result =
                    await apiService.getCommandExecution(
                        executionId
                    );
                failedPolls = 0;

                if (
                    result.state ===
                    'running'
                ) {
                    await sleep(
                        POLL_INTERVAL_MS
                    );
                    continue;
                }

                pushExecutionResult(
                    result
                );
                resetExecutionState();
                return;
            } catch (error) {
                failedPolls += 1;

                if (failedPolls >= 3) {
                    const message =
                        error instanceof Error &&
                        error.message.trim()
                            ? error.message
                            : 'Unable to refresh command status.';

                    appStore.pushLog(
                        `Error: ${message}`,
                        'cli',
                        'error'
                    );
                    resetExecutionState();
                    return;
                }

                await sleep(
                    POLL_INTERVAL_MS
                );
            }
        }
    };

    const executeCommand = async (
        command: string
    ) => {
        setIsExecuting(true);
        setIsCancelling(false);
        setPendingCommand(command);
        appStore.pushLog(
            `Running ${command}...`,
            'cli',
            'system'
        );

        try {
            const started =
                await apiService.startCommandExecution(
                    command
                );

            executionIdRef.current =
                started.executionId;
            setPendingExecutionId(
                started.executionId
            );

            if (
                started.state !== 'running'
            ) {
                pushExecutionResult(
                    started
                );
                resetExecutionState();
                return;
            }

            await pollExecution(
                started.executionId
            );
        } catch (error) {
            const message =
                error instanceof Error &&
                error.message.trim()
                    ? error.message
                    : 'Command failed.';
            const wasCancelled =
                message ===
                'Request cancelled.';

            appStore.pushLog(
                wasCancelled
                    ? `Command cancelled: ${command}`
                    : `Error: ${message}`,
                'cli',
                wasCancelled
                    ? 'system'
                    : 'error'
            );
        } finally {
            if (
                executionIdRef.current === null
            ) {
                resetExecutionState();
            }
        }
    };

    const cancelExecution = async () => {
        if (
            !pendingExecutionId ||
            isCancelling
        ) {
            return;
        }

        setIsCancelling(true);

        try {
            await apiService.cancelCommandExecution(
                pendingExecutionId
            );
        } catch (error) {
            const message =
                error instanceof Error &&
                error.message.trim()
                    ? error.message
                    : 'Unable to cancel the running command.';

            appStore.pushLog(
                `Error: ${message}`,
                'cli',
                'error'
            );
            setIsCancelling(false);
        }
    };

    const handleCommand = (
        e: React.FormEvent
    ) => {
        e.preventDefault();

        const trimmedInput =
            input.trim();

        if (
            !trimmedInput ||
            isExecuting
        ) {
            return;
        }

        const normalizedCommand =
            trimmedInput.toLowerCase();
        appStore.pushLog(
            `➜ ${trimmedInput}`,
            'cli',
            'system'
        );

        if (normalizedCommand === 'clear') {
            clearLogs();
        } else if (
            normalizedCommand === 'help'
        ) {
            appStore.pushLog(
                'Available commands: help, clear, txio <args>, cargo <args>',
                'cli',
                'system'
            );
            appStore.pushLog(
                "Only 'txio' and 'cargo' are forwarded to the backend terminal.",
                'cli',
                'system'
            );
        } else {
            void executeCommand(
                trimmedInput
            );
        }

        setInput('');
    };

    return (
        <AnimatePresence>
            {isTerminalOpen && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: terminalHeight, opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={
                        isDragging
                            ? { type: 'tween', duration: 0 }
                            : { type: 'spring', damping: 25, stiffness: 200 }
                    }
                    onClick={focusInput}
                    className="bg-near-black border-t border-white/[0.06] flex flex-col font-mono text-xs shadow-2xl relative z-40 overflow-hidden"
                >
                    {/* Resize handle */}
                    <div
                        onPointerDown={handleResizeStart}
                        onPointerMove={handleResizeMove}
                        onPointerUp={handleResizeEnd}
                        onPointerCancel={handleResizeEnd}
                        onClick={(e) => e.stopPropagation()}
                        role="separator"
                        aria-orientation="horizontal"
                        aria-label="Resize terminal"
                        className={`shrink-0 h-1.5 cursor-row-resize flex items-center justify-center group transition-colors ${
                            isDragging ? 'bg-electric-violet/40' : 'hover:bg-electric-violet/20'
                        }`}
                    >
                        <div
                            className={`h-0.5 rounded-full transition-all duration-200 ${
                                isDragging
                                    ? 'w-20 bg-electric-violet'
                                    : 'w-10 bg-white/[0.08] group-hover:w-16 group-hover:bg-electric-violet/60'
                            }`}
                        />
                    </div>

                    {/* Terminal Header */}
                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.06] bg-dark-indigo-glow select-none">
                        <div className="flex items-center gap-2.5 font-sans">
                            <div className="flex items-center gap-1.5 text-slate-300">
                                <Terminal size={12} className="text-electric-violet" />
                                <span className="text-[11px] font-medium tracking-tight">Terminal</span>
                            </div>
                            <div className="h-3 w-px bg-white/[0.08]"></div>
                            <span className="text-[11px] text-slate-500 font-mono">bash</span>
                            <div className="h-3 w-px bg-white/[0.08]"></div>
                            <div className={`flex items-center gap-1.5 text-[11px] font-medium ${
                                isCancelling
                                    ? 'text-amber-300'
                                    : isExecuting
                                    ? 'text-amber-400'
                                    : 'text-emerald-400/80'
                            }`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${
                                    isCancelling
                                        ? 'bg-amber-300 animate-pulse'
                                        : isExecuting
                                        ? 'bg-amber-400 animate-pulse'
                                        : 'bg-emerald-400/70'
                                }`}></span>
                                <span>
                                    {isCancelling
                                        ? 'stopping'
                                        : isExecuting
                                          ? 'running'
                                          : 'idle'}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowErrorsOnly((current) => !current);
                                }}
                                className={`p-1.5 rounded-md transition-colors ${
                                    showErrorsOnly
                                        ? 'text-electric-violet bg-electric-violet/[0.08]'
                                        : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.05]'
                                }`}
                                title={showErrorsOnly ? 'Show all logs' : 'Show only errors'}
                            >
                                <Filter size={13} />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    clearLogs();
                                }}
                                className="p-1.5 rounded-md text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors"
                                title="Clear console"
                            >
                                <Trash2 size={13} />
                            </button>
                            {isExecuting && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        void cancelExecution();
                                    }}
                                    disabled={isCancelling}
                                    className="p-1.5 rounded-md text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 transition-colors"
                                    title={`Cancel ${pendingCommand || 'command'}`}
                                >
                                    <Square size={11} fill="currentColor" />
                                </button>
                            )}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    appStore.toggleTerminal();
                                }}
                                className="p-1.5 rounded-md text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors"
                                aria-label="Close terminal"
                            >
                                <X size={13} />
                            </button>
                        </div>
                    </div>

                    {/* Terminal Output */}
                    <div 
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto p-4 space-y-1.5 custom-scrollbar bg-near-black"
                    >
                        {visibleLogs.map((log) => {
                            const isMultiline = log.action.includes('\n');
                            const typeBadge = (
                                <span className={`shrink-0 px-1.5 rounded-[2px] font-bold text-[9px] uppercase ${
                                    log.type === 'request' ? 'text-emerald-400 bg-emerald-400/5' :
                                    log.type === 'team' ? 'text-blue-400 bg-blue-400/5' :
                                    log.type === 'error' ? 'text-red-400 bg-red-400/5' :
                                    'text-soft-purple bg-soft-purple/5'
                                }`}>
                                    {log.type}
                                </span>
                            );
                            const timestamp = (
                                <span className="text-slate-600 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                            );

                            if (isMultiline) {
                                return (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        key={log.id}
                                        className="flex flex-col gap-1 group"
                                    >
                                        <div className="flex items-center gap-3">
                                            {timestamp}
                                            {typeBadge}
                                            <span className="text-slate-500 font-bold">{log.userName}</span>
                                            {log.target && <span className="text-electric-violet/60 italic text-[10px]">({log.target})</span>}
                                        </div>
                                        <pre className="text-white/90 whitespace-pre-wrap break-words ml-4 border-l border-white/5 pl-3">
                                            {log.action}
                                        </pre>
                                    </motion.div>
                                );
                            }

                            return (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    key={log.id}
                                    className="flex gap-3 group"
                                >
                                    {timestamp}
                                    {typeBadge}
                                    <span className="text-slate-300">
                                        <span className="text-slate-500 font-bold">{log.userName}</span>
                                        <span className="mx-2 text-slate-600">→</span>
                                        <span className="text-white/90 whitespace-pre-wrap break-words">{log.action}</span>
                                        {log.target && <span className="ml-2 text-electric-violet/60 italic">({log.target})</span>}
                                    </span>
                                </motion.div>
                            );
                        })}
                        
                        {/* Prompt */}
                        <div className="flex items-center gap-2 pt-2">
                            <span className="text-electric-violet font-bold">➜</span>
                            <span className="text-soft-purple font-bold">~</span>
                            <form onSubmit={handleCommand} className="flex-1">
                                <input 
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    disabled={isExecuting}
                                    className="w-full bg-transparent border-none outline-none text-white caret-electric-violet"
                                    autoFocus
                                    placeholder={isExecuting && pendingCommand
                                        ? `${isCancelling ? 'Stopping' : 'Running'} ${pendingCommand}...`
                                        : "Type 'help' for available commands..."}
                                />
                            </form>
                        </div>
                    </div>

                    {/* Subtle bottom glow */}
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-electric-violet/30 to-transparent"></div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
