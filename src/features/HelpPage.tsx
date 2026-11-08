/**
 * Help & Support: docs/GitHub/email links, an FAQ, and a contact form that
 * hands the message to the user's mail client. There is no live support-chat
 * backend, so nothing here pretends to be one.
 */
import React, { useState } from 'react';
import { BookOpen, ChevronDown, LifeBuoy, Mail, Send } from 'lucide-react';
import { useAppStore, appStore } from '@/lib/store';
import { Github } from '@/components/icons/BrandIcons';
import { Select } from '@/components/Select';

const SUPPORT_EMAIL = 'support@txio.dev';

const TOPICS = ['Bug report', 'Chain or RPC issue', 'Account or workspace', 'Feature request', 'Other'];

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
        answer: 'Yes. Collections belong to a workspace, so invite teammates to a Team workspace (Workspaces → Members) and they see the same collections.'
    },
    {
        question: 'Is my wallet’s private key ever sent to Txio’s servers?',
        answer: 'No. Wallets connect directly to the blockchain from your browser or CLI — Txio never sees or stores private keys or seed phrases.'
    },
    {
        question: 'How do I report a bug or request a feature?',
        answer: 'Open an issue on GitHub, or use the contact form on this page to email the team.'
    }
];

export const HelpPage: React.FC = () => {
    const { user } = useAppStore();
    const [openFaq, setOpenFaq] = useState<number | null>(0);
    const [topic, setTopic] = useState(TOPICS[0]);
    const [message, setMessage] = useState('');

    // Opens the user's mail client with the message filled in — a real channel,
    // unlike a chat box with no one on the other end.
    const handleSend = () => {
        const text = message.trim();
        if (!text) return;
        const signature = user ? `\n\n— ${user.name ?? ''} <${user.email}>` : '';
        const href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`[Txio] ${topic}`)}&body=${encodeURIComponent(text + signature)}`;
        window.location.href = href;
    };

    return (
        <div className="h-full overflow-y-auto custom-scrollbar bg-surface p-4 sm:p-6 md:p-8">
            <div className="space-y-6">
                <div>
                    <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-fg">Help &amp; Support</h1>
                    <p className="text-sm text-fg-subtle mt-1">Browse the docs and FAQ, or email the team.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">
                    <div className="space-y-6 min-w-0">
                        {/* Quick links */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <button
                                onClick={() => appStore.openTab('docs')}
                                className="flex items-start gap-3 p-4 rounded-card border border-line bg-sunken hover:bg-hover transition-colors text-left"
                            >
                                <div className="w-9 h-9 rounded-[10px] bg-hover flex items-center justify-center text-fg shrink-0">
                                    <BookOpen size={16} />
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-fg">Documentation</div>
                                    <div className="text-xs text-fg-subtle mt-0.5">Guides, CLI &amp; API reference</div>
                                </div>
                            </button>

                            <a
                                href="https://github.com/Kingvic300/txio/"
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-start gap-3 p-4 rounded-card border border-line bg-sunken hover:bg-hover transition-colors text-left"
                            >
                                <div className="w-9 h-9 rounded-[10px] bg-active flex items-center justify-center text-fg shrink-0">
                                    <Github size={16} />
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-fg">GitHub</div>
                                    <div className="text-xs text-fg-subtle mt-0.5">Report a bug or request a feature</div>
                                </div>
                            </a>

                            <a
                                href="mailto:support@txio.dev"
                                className="flex items-start gap-3 p-4 rounded-card border border-line bg-sunken hover:bg-hover transition-colors text-left"
                            >
                                <div className="w-9 h-9 rounded-[10px] bg-sky-500/10 flex items-center justify-center text-sky-500 shrink-0">
                                    <Mail size={16} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm font-semibold text-fg">Email</div>
                                    <div className="text-xs text-fg-subtle mt-0.5 break-all">{SUPPORT_EMAIL}</div>
                                </div>
                            </a>
                        </div>

                        {/* FAQ */}
                        <div className="rounded-card border border-line bg-sunken overflow-hidden">
                            <div className="px-5 py-4 border-b border-line">
                                <h2 className="text-sm font-semibold text-fg">Frequently asked questions</h2>
                            </div>
                            <div className="divide-y divide-line">
                                {FAQS.map((faq, i) => {
                                    const isOpen = openFaq === i;
                                    return (
                                        <div key={faq.question}>
                                            <button
                                                onClick={() => setOpenFaq(isOpen ? null : i)}
                                                className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-hover transition-colors"
                                            >
                                                <span className="text-sm font-medium text-fg">{faq.question}</span>
                                                <ChevronDown size={14} className={`text-fg-subtle shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                            </button>
                                            {isOpen && (
                                                <div className="px-5 pb-4 text-sm text-fg-subtle leading-relaxed">
                                                    {faq.answer}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Contact form */}
                    <div className="rounded-card border border-line bg-sunken overflow-hidden">
                        <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-line">
                            <div className="w-8 h-8 rounded-lg bg-hover flex items-center justify-center text-fg shrink-0">
                                <LifeBuoy size={15} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-sm font-semibold text-fg">Contact support</div>
                                <div className="text-[12px] text-fg-subtle">Sends from your email app to {SUPPORT_EMAIL}</div>
                            </div>
                        </div>
                        <div className="p-4 space-y-3">
                            <div>
                                <label className="block text-[12px] font-semibold text-fg-subtle mb-1.5">Topic</label>
                                <Select value={topic} options={TOPICS.map((t) => ({ label: t, value: t }))} onChange={setTopic} fullWidth ariaLabel="Topic" />
                            </div>
                            <div>
                                <label htmlFor="support-message" className="block text-[12px] font-semibold text-fg-subtle mb-1.5">Message</label>
                                <textarea
                                    id="support-message"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    rows={7}
                                    placeholder="What happened, which chain and network, and what you expected."
                                    className="w-full resize-y rounded-[10px] border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-line-strong placeholder:text-fg-subtle"
                                />
                            </div>
                            <button
                                onClick={handleSend}
                                disabled={!message.trim()}
                                className="w-full h-10 rounded-[10px] bg-inverse text-on-inverse text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Send size={14} /> Open in email app
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
