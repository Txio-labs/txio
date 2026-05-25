
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, X, Filter, Trash2, Command, Square } from 'lucide-react';
import { useAppStore, appStore } from '@/lib/store';
import { apiService, CommandExecutionResponse } from '@/services/api';

const POLL_INTERVAL_MS = 500;

export const TerminalPanel: React.FC = () => {
    const { activityLogs, isTerminalOpen } = useAppStore();
    const [input, setInput] = useState('');
    const [isExecuting, setIsExecuting] = useState(false);
    const [pendingCommand, setPendingCommand] = useState<string | null>(null);
    const [pendingExecutionId, setPendingExecutionId] = useState<string | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [showErrorsOnly, setShowErrorsOnly] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const executionIdRef = useRef<string | null>(null);
    const isMountedRef = useRef(true);

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
                    animate={{ height: 256, opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    onClick={focusInput}
                    className="bg-near-black border-t border-white/10 flex flex-col font-mono text-xs shadow-2xl relative z-40 overflow-hidden"
                >
                    {/* Terminal Header */}
                    <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-near-black/50 select-none">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-slate-400">
                                <Terminal size={14} className="text-electric-violet" />
                                <span className="font-bold uppercase tracking-widest text-[10px]">txio-terminal</span>
                            </div>
                            <div className="h-3 w-px bg-white/10"></div>
                            <div className="flex items-center gap-2 text-slate-600">
                                <Command size={12} />
                                <span>bash</span>
                            </div>
                            <div className="h-3 w-px bg-white/10"></div>
                            <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${
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
                        <div className="flex items-center gap-4">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowErrorsOnly((current) => !current);
                                }}
                                className={`transition-colors ${
                                    showErrorsOnly
                                        ? 'text-electric-violet'
                                        : 'text-slate-500 hover:text-white'
                                }`}
                                title={showErrorsOnly ? 'Show all logs' : 'Show only errors'}
                            >
                                <Filter size={14} />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    clearLogs();
                                }}
                                className="text-slate-500 hover:text-white transition-colors"
                                title="Clear console"
                            >
                                <Trash2 size={14} />
                            </button>
                            {isExecuting && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        void cancelExecution();
                                    }}
                                    disabled={isCancelling}
                                    className="text-amber-400 hover:text-amber-300 transition-colors"
                                    title={`Cancel ${pendingCommand || 'command'}`}
                                >
                                    <Square size={12} fill="currentColor" />
                                </button>
                            )}
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    appStore.toggleTerminal();
                                }}
                                className="text-slate-500 hover:text-white transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Terminal Output */}
                    <div 
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto p-4 space-y-1.5 custom-scrollbar bg-near-black"
                    >
                        {visibleLogs.map((log) => (
                            <motion.div 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                key={log.id} 
                                className="flex gap-3 group"
                            >
                                <span className="text-slate-600 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                <span className={`shrink-0 px-1.5 rounded-[2px] font-bold text-[9px] uppercase ${
                                    log.type === 'request' ? 'text-emerald-400 bg-emerald-400/5' :
                                    log.type === 'team' ? 'text-blue-400 bg-blue-400/5' :
                                    log.type === 'error' ? 'text-red-400 bg-red-400/5' :
                                    'text-soft-purple bg-soft-purple/5'
                                }`}>
                                    {log.type}
                                </span>
                                <span className="text-slate-300">
                                    <span className="text-slate-500 font-bold">{log.userName}</span>
                                    <span className="mx-2 text-slate-600">→</span>
                                    <span className="text-white/90 whitespace-pre-wrap break-words">{log.action}</span>
                                    {log.target && <span className="ml-2 text-electric-violet/60 italic">({log.target})</span>}
                                </span>
                            </motion.div>
                        ))}
                        
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
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-electric-violet/20 to-transparent"></div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
