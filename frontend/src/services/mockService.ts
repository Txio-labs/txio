
import { RPCHealthMetric, ObjectSnapshot, DashboardTransaction } from '../types';

// Simulate Network Latency
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock Data
export const MOCK_RPC_METRICS: RPCHealthMetric[] = [
    { endpoint: 'https://fullnode.mainnet.sui.io', latency: [120, 115, 125, 130, 110, 108, 112], successRate: 99.9, status: 'healthy', blockHeight: 12450392 },
    { endpoint: 'https://fullnode.testnet.sui.io', latency: [240, 260, 230, 250, 400, 220, 235], successRate: 98.5, status: 'degraded', blockHeight: 902314 },
    { endpoint: 'https://fullnode.devnet.sui.io', latency: [80, 85, 90, 82, 78, 88, 84], successRate: 100, status: 'healthy', blockHeight: 45012 },
    { endpoint: 'http://127.0.0.1:9000', latency: [5, 4, 6, 5, 5, 4, 5], successRate: 100, status: 'healthy', blockHeight: 102 }
];

export const MOCK_TRANSACTIONS: DashboardTransaction[] = [
  { id: '1', digest: '8Gf2x...k8l1', sender: '0x7d2...94d1', type: 'MoveCall', gas: '1200394', timestamp: Date.now() - 5000 },
  { id: '2', digest: '3Aa9p...q4m2', sender: '0xabc...ef01', type: 'Transfer', gas: '800400', timestamp: Date.now() - 15000 },
  { id: '3', digest: '9Zz1r...v2n3', sender: '0xdef...gh23', type: 'Publish', gas: '15000234', timestamp: Date.now() - 30000 },
  { id: '4', digest: '4Bb2s...w5o4', sender: '0x7d2...94d1', type: 'MoveCall', gas: '450000', timestamp: Date.now() - 45000 },
  { id: '5', digest: '5Cc3t...x6p5', sender: '0x1a2...3b4c', type: 'MoveCall', gas: '2100500', timestamp: Date.now() - 60000 },
  { id: '6', digest: '6Dd4u...y7q6', sender: '0x5e6...7f8g', type: 'Transfer', gas: '1000', timestamp: Date.now() - 90000 },
];

export const MOCK_OBJECTS: ObjectSnapshot[] = [
    { id: '0x123...abc', type: '0x2::coin::Coin<0x2::sui::SUI>', version: '102', owner: '0x7d2...94d1' },
    { id: '0x456...def', type: '0xabc::nft::Hero', version: '45', owner: '0x7d2...94d1' },
    { id: '0x789...ghi', type: '0x2::coin::Coin<0x2::sui::SUI>', version: '102', owner: '0x7d2...94d1' },
    { id: '0xabc...jkl', type: '0xabc::game::Sword', version: '12', owner: '0x7d2...94d1' },
    { id: '0xdef...mno', type: '0x2::package::Publisher', version: '8', owner: '0x7d2...94d1' },
    { id: '0xghi...pqr', type: '0x2::package::UpgradeCap', version: '8', owner: '0x7d2...94d1' },
    { id: '0xjkl...stu', type: '0xcafe::pool::LiquidityToken', version: '201', owner: '0x7d2...94d1' },
];

export const MOCK_PACKAGES = [
    { id: '0x1', name: 'MoveStdLib' },
    { id: '0x2', name: 'SuiFramework' },
    { id: '0x3', name: 'SuiSystem' },
    { id: '0xcafe', name: 'DefiProtocol' },
];

// Service Methods

export const fetchRPCHealth = async (): Promise<RPCHealthMetric[]> => {
    await delay(600);
    // Simulate slight jitter
    return MOCK_RPC_METRICS.map(m => ({
        ...m,
        latency: [...m.latency.slice(1), m.latency[m.latency.length - 1] + (Math.random() * 20 - 10)]
    }));
};

export const fetchRecentTransactions = async (): Promise<DashboardTransaction[]> => {
    await delay(300);
    return MOCK_TRANSACTIONS;
};

export const fetchOwnedObjects = async (address: string): Promise<ObjectSnapshot[]> => {
    await delay(400);
    return MOCK_OBJECTS;
};

export const executeMockTransaction = async (ptbData: any) => {
    await delay(1500);
    return {
        status: 'success',
        digest: '8Gf...' + Math.random().toString(36).substring(7),
        gasUsed: 1200394,
        events: ['CoinBalanceChanged', 'ObjectTransfer'],
        timestamp: Date.now()
    };
};

export const fetchMovePackage = async (id: string) => {
    await delay(300);
    return {
        id,
        modules: ['coin', 'balance', 'transfer'],
        publishedAt: '123456789'
    };
};
