/**
 * Help & Support page — scaffolded as a genuinely new page for the "Help"
 * nav item (previously rendered FeaturesPage, a marketing/feature-highlight
 * page unrelated to support). The support chat here is UI-only: there is no
 * backend support-chat channel wired up yet, so sent messages get a
 * simulated auto-reply rather than reaching a real person. FAQ content and
 * quick links are placeholder copy pending real support content.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
    BookOpen,
    ChevronDown,
    LifeBuoy,
    Loader2,
    Mail,
    MessageSquare,
    Send
} from 'lucide-react';
import { useAppStore, appStore } from '@/lib/store';
import { Github } from '@/components/icons/BrandIcons';

interface FaqItem {
    question: string;
    answer: string;
}

const FAQS: FaqItem[] = [
    {
        question: 'Which chains does Txio support?',
        answer: 'Sui, Ethereum (and EVM-compatible chains), Solana, Aptos, and Stellar/Soroban — from one CLI, backend, and dashboard.'
    },
    {
        question: 'How do I add a custom RPC endpoint?',
        answer: 'Go to Settings → Network & RPC, and set a custom endpoint per chain and environment. Requests fall back to the public default when left blank.'
    },
    {
        question: 'Can I share a collection with my team?',
        answer: 'Yes — open a collection and use Share to invite teammates to a workspace. Shared collections sync in real time.'
    },
    {
        question: 'Is my wallet’s private key ever sent to Txio’s servers?',
        answer: 'No. Wallets connect directly to the blockchain from your browser or CLI — Txio never sees or stores private keys or seed phrases.'
    },
    {
        question: 'How do I report a bug or request a feature?',
        answer: 'Use the chat on this page, or open an issue on GitHub — the team triages both.'
    }
];

interface ChatMessage {
    id: string;
    role: 'user' | 'support';
    text: string;
    timestamp: string;
}

const INITIAL_MESSAGE: ChatMessage = {
    id: 'm0',
    role: 'support',
    text: "Hi! I'm here to help with anything Txio-related — chains, RPC setup, collections, or your account. What's going on?",
    timestamp: 'Just now'
};

export const HelpPage: React.FC = () => {
    const { theme, user } = useAppStore();
    const isDark = theme === 'dark';
    const [openFaq, setOpenFaq] = useState<number | null>(0);
    const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
    const [input, setInput] = useState('');
    const [isReplying, setIsReplying] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages, isReplying]);

    const handleSend = () => {
        const text = input.trim();
        if (!text) return;

        setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text, timestamp: 'Just now' }]);
        setInput('');
        setIsReplying(true);

        // Simulated reply — no real support channel is wired up yet.
        setTimeout(() => {
            setIsReplying(false);
            setMessages((prev) => [
                ...prev,
                {
                    id: `s-${Date.now()}`,
                    role: 'support',
                    text: "Thanks for the details — a member of the team will follow up over email shortly. In the meantime, the FAQ on the left might help.",
                    timestamp: 'Just now'
                }
            ]);
        }, 1100);
    };

    return (
        <div className="h-full overflow-y-auto custom-scrollbar bg-white dark:bg-near-black p-6 md:p-8">
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Help &amp; Support</h1>
                    <p className="text-sm text-slate-500 mt-1">Search the FAQ, browse the docs, or chat with the team directly.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">
                    <div className="space-y-6 min-w-0">
                        {/* Quick links */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <button
                                onClick={() => appStore.openTab('docs')}
                                className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-dark-indigo-glow hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left"
                            >
                                <div className="w-9 h-9 rounded-xl bg-electric-violet/10 flex items-center justify-center text-electric-violet shrink-0">
                                    <BookOpen size={16} />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-slate-900 dark:text-white">Documentation</div>
                                    <div className="text-xs text-slate-500 mt-0.5">Guides, CLI &amp; API reference</div>
                                </div>
                            </button>

                            <a
                                href="https://github.com/Kingvic300/txio/"
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-dark-indigo-glow hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left"
                            >
                                <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0">
                                    <Github size={16} />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-slate-900 dark:text-white">GitHub</div>
                                    <div className="text-xs text-slate-500 mt-0.5">Report a bug or request a feature</div>
                                </div>
                            </a>

                            <a
                                href="mailto:support@txio.dev"
                                className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-dark-indigo-glow hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left"
                            >
                                <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-500 shrink-0">
                                    <Mail size={16} />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-slate-900 dark:text-white">Email</div>
                                    <div className="text-xs text-slate-500 mt-0.5">support@txio.dev</div>
                                </div>
                            </a>
                        </div>

                        {/* FAQ */}
                        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-dark-indigo-glow overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-200 dark:border-white/5">
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Frequently asked questions</h2>
                            </div>
                            <div className="divide-y divide-slate-200 dark:divide-white/5">
                                {FAQS.map((faq, i) => {
                                    const isOpen = openFaq === i;
                                    return (
                                        <div key={faq.question}>
                                            <button
                                                onClick={() => setOpenFaq(isOpen ? null : i)}
                                                className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-white dark:hover:bg-white/[0.02] transition-colors"
                                            >
                                                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{faq.question}</span>
                                                <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                            </button>
                                            {isOpen && (
                                                <div className="px-5 pb-4 text-sm text-slate-500 leading-relaxed">
                                                    {faq.answer}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Support chat */}
                    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-dark-indigo-glow overflow-hidden flex flex-col h-[560px]">
                        <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-slate-200 dark:border-white/5 shrink-0">
                            <div className="w-8 h-8 rounded-lg bg-electric-violet/10 flex items-center justify-center text-electric-violet shrink-0">
                                <LifeBuoy size={15} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-sm font-bold text-slate-900 dark:text-white">Chat with support</div>
                                <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Usually replies within a few hours
                                </div>
                            </div>
                        </div>

                        <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                            {messages.map((m) => (
                                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div
                                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                                            m.role === 'user'
                                                ? 'bg-electric-violet text-white rounded-br-sm'
                                                : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 rounded-bl-sm'
                                        }`}
                                    >
                                        {m.text}
                                    </div>
                                </div>
                            ))}
                            {isReplying && (
                                <div className="flex justify-start">
                                    <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3.5 py-2.5 text-xs text-slate-400">
                                        <Loader2 size={12} className="animate-spin" /> Support is typing...
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-3 border-t border-slate-200 dark:border-white/5 shrink-0">
                            <div className="flex items-end gap-2">
                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                    rows={1}
                                    placeholder={user ? `Message support as ${user.name ?? 'you'}...` : 'Describe your issue...'}
                                    className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-near-black px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-electric-violet/50 placeholder:text-slate-400 max-h-24"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim()}
                                    className="shrink-0 w-9 h-9 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-near-black flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                                    title="Send"
                                >
                                    <Send size={14} />
                                </button>
                            </div>
                            <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-400">
                                <MessageSquare size={10} /> Chat is not yet connected to a live support queue.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
