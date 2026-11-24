import React from 'react';
import { Hammer } from 'lucide-react';
import { EmptyState, Page, PageHeader } from '@/components/ui/primitives';

/** Placeholder for a feature that is hidden from use until it ships. */
export const ComingSoonPage: React.FC<{ title: string }> = ({ title }) => (
    <Page>
        <PageHeader title={title} />
        <EmptyState
            icon={<Hammer size={18} />}
            title="Coming soon"
            description={`${title} is not available yet. It will show up here when it ships.`}
        />
    </Page>
);
