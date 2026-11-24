'use client';

import React from "react";
import { Layout } from "@/components/Layout";
import { RightPanel } from "@/components/RightPanel/RightPanel";
import { AuthModal } from "@/components/AuthModal/AuthModal";
import { useAppStore, appStore } from "@/lib/store";
import { TeamMember } from "@/types";

// Import your feature components
import { Dashboard } from "@/features/Dashboard";
import { RPCBuilder } from "@/features/RPCBuilder";
import { HistoryFeature } from "@/features/History";
import { NewRequestPage } from "@/features/NewRequestPage";
import { WalletsPage } from "@/features/WalletsPage";
import { ProfilePage } from "@/features/ProfilePage";
import { SettingsPage } from "@/features/SettingsPage";
import { CollectionRunner } from "@/features/CollectionRunner";
import { ComingSoonPage } from "@/features/ComingSoonPage";
import { WorkspaceOnboarding } from "@/features/WorkspaceOnboarding";
import { DocsPage } from "@/features/DocsPage";
import { EcosystemPage } from "@/features/EcosystemPage";
import { FeaturesPage } from "@/features/FeaturesPage";
import { IntegrationsPage } from "@/features/IntegrationsPage";
import { PartnersPage } from "@/features/PartnersPage";
import { NewCollectionPage } from "@/features/NewCollectionPage";
import { NetworksPage } from "@/features/NetworksPage";
import { CollectionsPage } from "@/features/CollectionsPage";
import { WorkspaceOverviewPage } from "@/features/WorkspaceOverviewPage";
import { SuiExplorerFeature } from "@/features/SuiExplorer";
import { EvmExplorerFeature } from "@/features/EvmExplorer";
import { SolanaExplorerFeature } from "@/features/SolanaExplorer";
import { StellarWorkspace } from "@/features/StellarMarkets";
import { AptosExplorerFeature } from "@/features/AptosExplorer";
import { StarknetExplorerFeature } from "@/features/StarknetExplorer";
import { HelpPage } from "@/features/HelpPage";
import { AdminPage } from "@/features/AdminPage";
import { ApprovalsPage } from "@/features/ApprovalsPage";
import { SwapPage } from "@/features/SwapPage";
import { AutomationPage } from "@/features/AutomationPage";
import { DevelopersPage } from "@/features/DevelopersPage";
import { InviteBanner } from "@/components/InviteBanner";
import { useSharedComments } from "@/lib/useSharedComments";

const MOCK_TEAM: TeamMember[] = [];

const WorkspaceContent: React.FC = () => {
    const { tabs, activeTabId } = useAppStore();
    const activeTab = tabs.find(t => t.id === activeTabId);

    if (!activeTabId || !activeTab) {
        return <Dashboard />;
    }

    switch (activeTab.type) {
        case 'dashboard':
            return <Dashboard />;
        case 'rpc':
        // 'ptb' tabs are legacy (the Sui-only PTB canvas was removed); any
        // still open from a previous session open in the request editor.
        case 'ptb':
            return <RPCBuilder />;
        case 'history':
            return <HistoryFeature />;
        case 'settings':
            return <SettingsPage />;
        case 'admin':
            return <AdminPage />;
        case 'approvals':
            return <ApprovalsPage />;
        case 'send':
            return <SwapPage />;
        case 'automation':
            return <AutomationPage />;
        case 'developers':
            return <DevelopersPage />;
        case 'profile':
            return <WalletsPage />;
        case 'account':
            return <ProfilePage />;
        case 'new_request':
            return <NewRequestPage tabId={activeTab.id} initialData={activeTab.data} />;
        case 'collections':
            return <CollectionsPage />;
        case 'runner':
            return <CollectionRunner collectionId={activeTab.data?.collectionId} />;
        case 'move':
            return <ComingSoonPage title="Contracts" />;
        case 'workspace_overview':
            return <WorkspaceOverviewPage />;
        case 'docs':
            return <DocsPage embedded />;
        case 'ecosystem':
            return <EcosystemPage embedded />;
        case 'features':
            return <FeaturesPage embedded />;
        case 'help':
            return <HelpPage />;
        case 'integrations':
            return <IntegrationsPage embedded />;
        case 'infrastructure':
            return <NetworksPage />;
        case 'partners':
            return <PartnersPage embedded />;
        case 'explorer':
            return <SuiExplorerFeature initialQuery={activeTab.data?.query} />;
        case 'starknet_explorer':
            return <StarknetExplorerFeature initialQuery={activeTab.data?.query} />;
        case 'stellar_explorer':
            return <StellarWorkspace initialQuery={activeTab.data?.query} />;
        case 'aptos_explorer':
            return <AptosExplorerFeature initialQuery={activeTab.data?.query} />;
        case 'solana_explorer':
            return <SolanaExplorerFeature initialQuery={activeTab.data?.query} />;
        case 'evm_explorer':
            return <EvmExplorerFeature initialQuery={activeTab.data?.query} chainId={activeTab.data?.chainId} />;
        case 'new_collection':
            return <NewCollectionPage tabId={activeTab.id} />;
        default:
            return <Dashboard />;
    }
};

export default function WorkspacePage() {
    const {
        tabs,
        activeTabId,
        workspaces,
        currentWorkspaceId,
        hasHydratedWorkspaces,
        isAuthModalOpen,
        user,
        activityLogs,
        comments,
        network,
    } = useAppStore();

    const currentWorkspace =
        workspaces.find((w) => w.id === currentWorkspaceId) || workspaces[0];
    // Comments live on the server and are visible to the workspace's members.
    const shared = useSharedComments(currentWorkspace?.id, activeTabId);
    const needsWorkspaceSetup =
        Boolean(user) &&
        hasHydratedWorkspaces &&
        workspaces.length === 0;
    const isBootstrappingWorkspace =
        Boolean(user) &&
        !hasHydratedWorkspaces;

    return (
        <>
            <div>
                {isBootstrappingWorkspace ? (
                    <div
                        role="status"
                        aria-live="polite"
                        className="fixed inset-0 flex items-center justify-center bg-canvas px-6 text-fg"
                    >
                        <div className="flex w-full max-w-sm flex-col items-center text-center">
                            <div className="text-lg font-semibold lowercase tracking-[0.4em] text-fg">
                                txio
                            </div>
                            <div className="mt-8 h-px w-full overflow-hidden bg-line">
                                <div className="h-full w-1/3 animate-pulse bg-fg-subtle" />
                            </div>
                            <h2 className="mt-6 text-base font-semibold text-fg">
                                Restoring your workspace
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-fg-muted">
                                Loading your environments and saved context.
                            </p>
                        </div>
                    </div>
                ) : needsWorkspaceSetup ? (
                    user ? (
                        <WorkspaceOnboarding
                            user={user}
                            onCreateWorkspace={
                                appStore.createWorkspace
                            }
                        />
                    ) : null
                ) : currentWorkspace ? (
                <Layout
                    onCreateWorkspace={appStore.createWorkspace}
                    workspace={<WorkspaceContent />}
                    inspector={
                        <RightPanel
                            network={network}
                            activityLogs={activityLogs}
                            comments={shared.comments}
                            activeRequestId={activeTabId || ""}
                            onPostComment={(content) => void shared.post(content)}
                            onClose={() =>
                                appStore.toggleInspector()
                            }
                        />
                    }
                    tabs={tabs}
                    activeTabId={activeTabId || undefined}
                    onSelectTab={appStore.setActiveTab}
                    onCloseTab={appStore.closeTab}
                    onRenameTab={appStore.renameTab}
                    onNewTab={() =>
                        appStore.openTab("new_request")
                    }
                />
                ) : null}
            </div>

            {user && <InviteBanner />}

            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() =>
                    appStore.setAuthModal(false)
                }
                user={user}
                onLogin={appStore.login}
                onSignup={appStore.signup}
                onLogout={appStore.logout}
                teamMembers={MOCK_TEAM}
            />
        </>
    );
}
