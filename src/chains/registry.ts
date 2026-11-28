/**
 * Chain workspaces. After sign-in the user picks one chain, and the app
 * shows that chain's own layout, navigation and tools. This file is the
 * single description of what each chain workspace contains; the layouts in
 * src/chains/layouts read it, so adding a tool to a chain is a data change.
 *
 * Tools that work on every chain (collections, history, wallets, networks,
 * automation) appear in every workspace. Chain-only tools appear only in the
 * workspace of the chain they work with, for example token approvals in EVM.
 */
import type { LucideIcon } from 'lucide-react';
import {
    Activity,
    BookOpen,
    Briefcase,
    Code2,
    FolderKanban,
    Hammer,
    HelpCircle,
    KeyRound,
    LayoutDashboard,
    Network as NetworkIcon,
    Repeat,
    Search,
    Settings,
    ShieldCheck,
    UserCog,
    Wallet as WalletIcon,
    Zap,
} from 'lucide-react';
import type { ChainId, FeatureId } from '@/types';

export interface ChainNavItem {
    id: FeatureId;
    label: string;
    icon: LucideIcon;
}

export interface ChainNavGroup {
    label: string;
    items: ChainNavItem[];
}

/** The page structure a chain workspace uses. Each value has its own layout component. */
export type ChainLayoutKind = 'sidebar' | 'topbar' | 'activity-rail' | 'icon-rail' | 'split' | 'console';

export interface ChainWorkspaceDef {
    id: ChainId;
    name: string;
    /** One line on the picker card: what developers do in this workspace. */
    summary: string;
    /** The languages and tools a developer recognises the chain by. */
    stack: string[];
    layout: ChainLayoutKind;
    /** The feature that opens this chain's explorer, when the chain has one. */
    explorer: FeatureId | null;
    nav: ChainNavGroup[];
    footer: ChainNavItem[];
}

const OVERVIEW: ChainNavItem = { id: 'dashboard', label: 'Overview', icon: LayoutDashboard };
const REQUESTS: ChainNavItem = { id: 'rpc', label: 'Requests', icon: Zap };
const CONTRACTS: ChainNavItem = { id: 'move', label: 'Contracts', icon: Hammer };
const COLLECTIONS: ChainNavItem = { id: 'collections', label: 'Collections', icon: FolderKanban };
const HISTORY: ChainNavItem = { id: 'history', label: 'History', icon: Activity };
const SEND: ChainNavItem = { id: 'send', label: 'Send', icon: Repeat };
const WALLETS: ChainNavItem = { id: 'profile', label: 'Wallets', icon: WalletIcon };
const APPROVALS: ChainNavItem = { id: 'approvals', label: 'Approvals', icon: KeyRound };
const NETWORKS: ChainNavItem = { id: 'infrastructure', label: 'Networks', icon: NetworkIcon };
const AUTOMATION: ChainNavItem = { id: 'automation', label: 'Automation', icon: ShieldCheck };
const WORKSPACES: ChainNavItem = { id: 'workspace_overview', label: 'Workspaces', icon: Briefcase };
// Finds an address or hash on any chain and opens that chain's explorer (which moves to its workspace).
const LOOKUP: ChainNavItem = { id: 'lookup', label: 'Lookup', icon: Search };

const explorerItem = (id: FeatureId, label = 'Explorer'): ChainNavItem => ({ id, label, icon: Search });

export const SHARED_FOOTER: ChainNavItem[] = [
    { id: 'docs', label: 'Documentation', icon: BookOpen },
    { id: 'developers', label: 'Developers', icon: Code2 },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help', icon: HelpCircle },
];

// Only shown to accounts with the server-side is_admin flag; the backend rejects /admin requests from anyone else.
export const ADMIN_NAV_ITEM: ChainNavItem = { id: 'admin', label: 'Admin', icon: UserCog };

const operate: ChainNavGroup = { label: 'Operate', items: [NETWORKS, AUTOMATION, WORKSPACES] };

export const CHAIN_WORKSPACES: Record<ChainId, ChainWorkspaceDef> = {
    sui: {
        id: 'sui',
        name: 'Sui',
        summary: 'Query objects, build programmable transaction blocks and call Move functions.',
        stack: ['Move', 'PTB', 'JSON-RPC', 'GraphQL'],
        layout: 'sidebar',
        explorer: 'explorer',
        nav: [
            { label: 'Build', items: [OVERVIEW, REQUESTS, CONTRACTS, COLLECTIONS, HISTORY, LOOKUP] },
            { label: 'Inspect', items: [explorerItem('explorer', 'Object explorer')] },
            { label: 'Assets', items: [SEND, WALLETS] },
            operate,
        ],
        footer: SHARED_FOOTER,
    },
    starknet: {
        id: 'starknet',
        name: 'Starknet',
        summary: 'Call Cairo contracts, simulate multicalls and inspect transactions and accounts.',
        stack: ['Cairo', 'JSON-RPC 0.10', 'Multicall', 'Account abstraction'],
        layout: 'topbar',
        explorer: 'starknet_explorer',
        nav: [
            { label: 'Studio', items: [OVERVIEW, REQUESTS, CONTRACTS, explorerItem('starknet_explorer'), COLLECTIONS, HISTORY, LOOKUP] },
            { label: 'Accounts', items: [WALLETS, SEND] },
            operate,
        ],
        footer: SHARED_FOOTER,
    },
    evm: {
        id: 'evm',
        name: 'Ethereum / EVM',
        summary: 'Send eth_* calls to Ethereum and L2s, encode ABI calls and review token approvals.',
        stack: ['Solidity', 'ABI', 'eth_* JSON-RPC', 'L2s'],
        layout: 'split',
        explorer: 'evm_explorer',
        nav: [
            { label: 'Build', items: [OVERVIEW, REQUESTS, CONTRACTS, COLLECTIONS, HISTORY, LOOKUP] },
            { label: 'Inspect', items: [explorerItem('evm_explorer'), APPROVALS] },
            { label: 'Assets', items: [SEND, WALLETS] },
            operate,
        ],
        footer: SHARED_FOOTER,
    },
    solana: {
        id: 'solana',
        name: 'Solana',
        summary: 'Query accounts and slots, build instructions and simulate transactions.',
        stack: ['Programs', 'Anchor', 'JSON-RPC', 'SPL'],
        layout: 'icon-rail',
        explorer: 'solana_explorer',
        nav: [
            { label: 'Build', items: [OVERVIEW, REQUESTS, CONTRACTS, COLLECTIONS, HISTORY, LOOKUP] },
            { label: 'Inspect', items: [explorerItem('solana_explorer')] },
            { label: 'Assets', items: [SEND, WALLETS] },
            operate,
        ],
        footer: SHARED_FOOTER,
    },
    aptos: {
        id: 'aptos',
        name: 'Aptos',
        summary: 'Read resources over the REST API and run Move entry functions.',
        stack: ['Move', 'REST API', 'Entry functions', 'Resources'],
        layout: 'activity-rail',
        explorer: 'aptos_explorer',
        nav: [
            { label: 'Build', items: [OVERVIEW, REQUESTS, CONTRACTS, COLLECTIONS, HISTORY, LOOKUP] },
            { label: 'Inspect', items: [explorerItem('aptos_explorer')] },
            { label: 'Assets', items: [SEND, WALLETS] },
            operate,
        ],
        footer: SHARED_FOOTER,
    },
    stellar: {
        id: 'stellar',
        name: 'Stellar',
        summary: 'Call Soroban RPC and Horizon, and build, simulate and sign Soroban transactions.',
        stack: ['Soroban', 'Horizon', 'XDR', 'Rust contracts'],
        layout: 'console',
        explorer: 'stellar_explorer',
        nav: [
            { label: 'Build', items: [OVERVIEW, REQUESTS, CONTRACTS, COLLECTIONS, HISTORY, LOOKUP] },
            { label: 'Inspect', items: [explorerItem('stellar_explorer', 'Explorer and markets')] },
            { label: 'Assets', items: [SEND, WALLETS] },
            operate,
        ],
        footer: SHARED_FOOTER,
    },
};

/** Picker order. Matches RPC_CHAINS so every list of chains in the app reads the same. */
export const CHAIN_ORDER: ChainId[] = ['sui', 'evm', 'stellar', 'solana', 'aptos', 'starknet'];

export const chainWorkspace = (chain: ChainId): ChainWorkspaceDef => CHAIN_WORKSPACES[chain];

/** Every feature a chain workspace links to, so a tab opened elsewhere can be checked against it. */
export const chainFeatures = (chain: ChainId): Set<FeatureId> => {
    const def = CHAIN_WORKSPACES[chain];
    return new Set([...def.nav.flatMap((g) => g.items), ...def.footer].map((i) => i.id));
};
