'use client';

import React, { useState } from 'react';
import { Segmented } from '@/components/ui/primitives';
import { ContractBuilder } from '@/features/ContractBuilder';
import { ContractStudio } from './ContractStudio';
import { ToolsPanel } from './ToolsPanel';

type StudioTab = 'contract' | 'tools' | 'build';

/**
 * Cairo Studio, the Starknet workspace's contract page: browse and call a
 * contract from its ABI, convert Cairo values, and compile, declare and
 * deploy a contract (the shared contract builder, fixed to Starknet).
 */
export const CairoStudio: React.FC = () => {
    const [tab, setTab] = useState<StudioTab>('contract');
    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-2.5">
                <h2 className="text-[15px] font-semibold text-fg">Cairo Studio</h2>
                <Segmented<StudioTab>
                    size="sm"
                    value={tab}
                    onChange={setTab}
                    options={[
                        { value: 'contract', label: 'Contract' },
                        { value: 'tools', label: 'Tools' },
                        { value: 'build', label: 'Build and deploy' },
                    ]}
                />
            </div>
            <div className="min-h-0 flex-1">
                {tab === 'contract' && <ContractStudio />}
                {tab === 'tools' && <ToolsPanel />}
                {tab === 'build' && <ContractBuilder lockedChain="starknet" />}
            </div>
        </div>
    );
};
