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
import { PTBBuilder } from "@/features/PTBBuilder";
import { HistoryFeature } from "@/features/History";
import { NewRequestPage } from "@/features/NewRequestPage";
import { WalletsPage } from "@/features/WalletsPage";
import { ProfilePage } from "@/features/ProfilePage";
import { SettingsPage } from "@/features/SettingsPage";
import { AIChat } from "@/features/AIChat";
import { CollectionRunner } from "@/features/CollectionRunner";
import { MoveBuilder } from "@/features/MoveBuilder";
import { Playground } from "@/features/Playground";
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
import { HelpPage } from "@/features/HelpPage";

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
            return <RPCBuilder />;
        case 'ptb':
            return <PTBBuilder />;
        case 'history':
            return <HistoryFeature />;
        case 'settings':
            return <SettingsPage />;
        case 'profile':
            return <WalletsPage />;
        case 'account':
            return <ProfilePage />;
        case 'ai_chat':
            return <AIChat />;
        case 'new_request':
            return <NewRequestPage tabId={activeTab.id} initialData={activeTab.data} />;
        case 'collections':
            return <CollectionsPage />;
        case 'runner':
            return <CollectionRunner collectionId={activeTab.data?.collectionId} />;
        case 'move':
            return <MoveBuilder />;
        case 'playground':
            return <Playground />;
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
                    <div className="min-h-screen bg-white dark:bg-near-black text-slate-900 dark:text-white flex items-center justify-center px-6">
                        <div className="w-full max-w-md rounded-[2rem] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.035] p-8 text-center shadow-[0_30px_80px_-55px_rgba(163,163,163,0.65)]">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-slate-900/10 dark:bg-white/10 text-slate-900 dark:text-white">
                                <div className="h-6 w-6 rounded-full border-2 border-slate-900/30 dark:border-white/30 border-t-slate-900 dark:border-t-white animate-spin" />
                            </div>
                            <h2 className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">
                                Loading workspace state
                            </h2>
                            <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">
                                Restoring your txio environment, workspace list,
                                and saved operational context.
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
                            comments={
                                activeTabId
                                    ? comments[activeTabId] || []
                                    : []
                            }
                            activeRequestId={activeTabId || ""}
                            onPostComment={(content) =>
                                activeTabId &&
                                appStore.postComment(
                                    activeTabId,
                                    content
                                )
                            }
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
