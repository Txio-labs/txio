import { describe, it, expect } from 'vitest';
import { formatUnitsFixed, summarizeResult } from './summary';

describe('formatUnitsFixed', () => {
  it('rounds to nearest at the requested places', () => {
    expect(formatUnitsFixed(1_234_500_000n, 9, 4)).toBe('1.2345');
    expect(formatUnitsFixed(1_234_560_000_000_000_000n, 18, 4)).toBe('1.2346');
  });
  it('carries across the decimal point', () => {
    expect(formatUnitsFixed(999_950_000_000_000_000n, 18, 4)).toBe('1.0000');
  });
});

describe('summarizeResult', () => {
  it('shows only the SUI figure for a Sui balance and keeps other coins raw', () => {
    const result = [
      { coinType: '0x2::sui::SUI', totalBalance: '1234500000' },
      { coinType: '0xdba3::usdc::USDC', totalBalance: '42' },
    ];
    expect(summarizeResult('sui', 'suix_getAllBalances', result)).toEqual([
      '1.2345 SUI',
      '42 0xdba3::usdc::USDC',
    ]);
  });

  it('formats an EVM and a Solana balance', () => {
    expect(summarizeResult('evm', 'eth_getBalance', '0xde0b6b3a7640000')).toEqual(['1.0000 ETH']);
    expect(summarizeResult('solana', 'getBalance', { context: {}, value: 1_500_000_000 })).toEqual(['1.5000 SOL']);
  });

  it("summarizes a Stellar Horizon account balance per asset", () => {
    const account = {
      balances: [
        { balance: "0.9580461", asset_type: "credit_alphanum4", asset_code: "USDC" },
        { balance: "2.1455334", asset_type: "native" },
      ],
    };
    expect(summarizeResult("stellar", "getBalance", account)).toEqual(["0.9580 USDC", "2.1455 XLM"]);
  });

  it('shows a scalar result bare for any other method', () => {
    expect(summarizeResult('evm', 'eth_blockNumber', '0x10')).toEqual(['0x10']);
  });

  it('returns null for structured results it cannot shorten', () => {
    expect(summarizeResult('sui', 'suix_getCoins', [{ a: 1 }])).toBeNull();
    expect(summarizeResult('evm', 'eth_getBalance', { weird: true })).toBeNull();
  });
});
