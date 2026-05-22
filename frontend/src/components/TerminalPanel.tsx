
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, X, ChevronRight, Filter, Trash2, Command } from 'lucide-react';
import { useAppStore, appStore } from '@/lib/store';
import { apiService } from '@/services/api';

export const TerminalPanel: React.FC = () => {
    const { activityLogs, isTerminalOpen } = useAppStore();
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const focusInput = () => {
        inputRef.current?.focus();
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [activityLogs]);

    const handleCommand = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const cmd = input.trim().toLowerCase();
        appStore.pushLog(`➜ ${cmd}`, 'cli', 'system');

        if (cmd === 'clear') {
            appStore.clearActivityLogs();
            appStore.showToast('Terminal cleared', 'info');
        } else if (cmd === 'help') {
            appStore.pushLog('Available commands: txio, cargo, help, clear', 'cli', 'system');
        } else {
            // Forward to actual Rust CLI
            const executeCli = async () => {
                try {
                    const result = await apiService.executeCommand(input.trim());
                    appStore.pushLog(result.output, 'cli', result.status === 'success' ? 'system' : 'error');
                    if (result.status === 'success' && input.includes('deploy')) {
                        appStore.showToast('Package deployed', 'success');
                    }
                } catch (error: any) {
                    appStore.pushLog(`Error: ${error.message}`, 'cli', 'error');
                }
            };
            executeCli();
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
                        </div>
                        <div className="flex items-center gap-4">
                            <button className="text-slate-500 hover:text-white transition-colors" title="Filter logs">
                                <Filter size={14} />
                            </button>
                            <button className="text-slate-500 hover:text-white transition-colors" title="Clear console">
                                <Trash2 size={14} />
                            </button>
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
                        {activityLogs.slice().reverse().map((log) => (
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
                                    <span className="text-white/90">{log.action}</span>
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
                                    className="w-full bg-transparent border-none outline-none text-white caret-electric-violet"
                                    autoFocus
                                    placeholder="Type 'help' for available commands..."
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
