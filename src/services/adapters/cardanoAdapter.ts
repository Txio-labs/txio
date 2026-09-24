import type { ChainAdapter, DescribedTransaction, TxContext, TxResult } from '../chainAdapter';
import { ChainExecutionError } from '../chainAdapter';
import type { Network, RequestItem } from '../../types';

/**
 * Cardano has no transaction adapter yet. Its UTxO/script/datum/redeemer
 * execution model doesn't fit the account+contract+function shape the other
 * adapters share, and building it properly needs its own SDK, wallet
 * integration (CIP-30), and UTxO-selection logic — none of which exist in
 * this app. Rather than omitting 'cardano' from ChainId (which would make
 * every switch/lookup over ChainId silently incomplete) or faking support,
 * this adapter is registered but every method reports clearly that Cardano
 * isn't supported yet. It's also excluded from RPC_CHAINS (lib/constants.ts)
 * so it can't be selected as a request chain in the UI until a real
 * implementation lands.
 */
const notSupported = (): never => {
    throw new ChainExecutionError(
        'Cardano transaction support is not implemented yet.',
        { code: 'UNSUPPORTED_CHAIN', chain: 'cardano', stage: 'validate' }
    );
};

export class CardanoAdapter implements ChainAdapter {
    readonly chain = 'cardano' as const;
    readonly label = 'Cardano';

    validate(_request: RequestItem): string | null {
        return 'Cardano transaction support is not implemented yet.';
    }

    targetAddress(_request: RequestItem): string | null {
        return null;
    }

    describe(_request: RequestItem): DescribedTransaction {
        return { chain: this.chain, kind: 'Unsupported', target: '', details: [] };
    }

    isMainnetExecution(_request: RequestItem, network: Network): boolean {
        return network === 'mainnet';
    }

    explorerUrl(_network: Network, _txId: string): string | undefined {
        return undefined;
    }

    async simulate(_request: RequestItem, _ctx: TxContext): Promise<TxResult> {
        return notSupported();
    }

    async execute(_request: RequestItem, _ctx: TxContext): Promise<TxResult> {
        return notSupported();
    }
}

export const cardanoAdapter = new CardanoAdapter();
