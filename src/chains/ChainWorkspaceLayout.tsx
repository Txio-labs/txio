import React from 'react';
import type { ChainLayoutProps } from '@/components/shell/frame';
import type { ChainLayoutKind } from './registry';
import { ActivityRailLayout } from './layouts/ActivityRailLayout';
import { ConsoleLayout } from './layouts/ConsoleLayout';
import { IconRailLayout } from './layouts/IconRailLayout';
import { SidebarLayout } from './layouts/SidebarLayout';
import { SplitLayout } from './layouts/SplitLayout';
import { TopbarLayout } from './layouts/TopbarLayout';

const LAYOUTS: Record<ChainLayoutKind, React.ComponentType<ChainLayoutProps>> = {
    sidebar: SidebarLayout,
    topbar: TopbarLayout,
    'activity-rail': ActivityRailLayout,
    'icon-rail': IconRailLayout,
    split: SplitLayout,
    console: ConsoleLayout,
};

/** Renders the layout the chain workspace in `props.def` uses. */
export function ChainWorkspaceLayout(props: ChainLayoutProps) {
    const Layout = LAYOUTS[props.def.layout];
    return <Layout {...props} />;
}
