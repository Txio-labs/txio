import type { ChainId } from '@/types';

/** The four template groups in the Contract Builder sidebar. */
export type TemplateCategory = 'core' | 'defi' | 'identity' | 'social';

export interface ContractTemplate {
    /** Used as the new module's contract name. */
    name: string;
    /** One line, shown with the template. */
    summary: string;
    code: string;
}

export type ChainTemplates = Record<TemplateCategory, ContractTemplate>;

export type TemplatesByChain = Partial<Record<ChainId, ChainTemplates>>;
