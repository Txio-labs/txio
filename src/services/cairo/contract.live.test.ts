// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { Network } from '@/types';
import { callableFunctions } from './abi';
import { loadClassAt, readCall } from './contract';
import { STRK_TOKEN_ADDRESS } from '../starknet';

// Real Starknet RPC, about six calls per network. Run with:
// LIVE=1 npx vitest run src/services/cairo/contract.live.test.ts
const live = process.env.LIVE === '1';

describe.skipIf(!live).each<Network>(['mainnet', 'testnet'])('Cairo Studio against the STRK token (%s)', (network) => {
    it('loads the ABI from chain and decodes real read calls', async () => {
        const cls = await loadClassAt(network, STRK_TOKEN_ADDRESS);
        expect(cls.abi.cairoVersion).toBe(1);
        expect(cls.classHash).toMatch(/^0x[0-9a-f]+$/);
        const fn = (name: string) => callableFunctions(cls.abi).find((f) => f.name === name)!;

        const name = await readCall(network, STRK_TOKEN_ADDRESS, cls.abi, fn('name'), []);
        const symbol = await readCall(network, STRK_TOKEN_ADDRESS, cls.abi, fn('symbol'), []);
        const decimals = await readCall(network, STRK_TOKEN_ADDRESS, cls.abi, fn('decimals'), []);
        // Any address works as the holder; the point is decoding a real u256.
        const balance = await readCall(network, STRK_TOKEN_ADDRESS, cls.abi, fn('balanceOf'), [STRK_TOKEN_ADDRESS]);

        expect(name.decodeError).toBeNull();
        expect(name.decoded).toBe('Starknet Token');
        expect(symbol.decoded).toBe('STRK');
        expect(decimals.decoded).toBe('18');
        expect(balance.decodeError).toBeNull();
        expect(balance.decoded).toMatch(/^\d+$/);
        // u256 comes back as two felts, and the decoded value is low + high * 2^128.
        expect(balance.result).toHaveLength(2);
        expect(BigInt(balance.decoded as string)).toBe(BigInt(balance.result[0]) + (BigInt(balance.result[1]) << 128n));
    }, 60000);
});
