import type { TemplatesByChain } from './types';
import { APTOS_TEMPLATES } from './aptos';
import { EVM_TEMPLATES } from './evm';
import { SOLANA_TEMPLATES } from './solana';
import { STARKNET_TEMPLATES } from './starknet';
import { STELLAR_TEMPLATES } from './stellar';
import { SUI_TEMPLATES } from './sui';

export type { ContractTemplate, TemplateCategory } from './types';

/** Starter contracts for every Contract Builder chain, one per sidebar group. */
export const CONTRACT_TEMPLATES: TemplatesByChain = {
    evm: EVM_TEMPLATES,
    stellar: STELLAR_TEMPLATES,
    solana: SOLANA_TEMPLATES,
    starknet: STARKNET_TEMPLATES,
    sui: SUI_TEMPLATES,
    aptos: APTOS_TEMPLATES
};
