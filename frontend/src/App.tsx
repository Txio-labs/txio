import React, { useState, useEffect } from "react";

import { Layout } from "./Layout";
import { Sidebar } from "@/components/SideBar/Sidebar";
import { RightPanel } from "@/components/RightPanel/RightPanel";
import { AuthModal } from "@/components/AuthModal/AuthModal";
import { EntranceAnimation } from "@/components/EntranceAnimation";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";

import { useAppStore, appStore } from "@/lib/store";
import { RequestType, TeamMember } from "@/types";

// Import your feature components
import { Dashboard } from "@/features/Dashboard";
import { LandingPage } from "@/features/LandingPage";
import { DocsPage } from "@/features/DocsPage";
import { EcosystemPage } from "@/features/EcosystemPage";
import { AuthPage } from "@/features/AuthPage";
import { SignInPage } from "@/features/SignInPage";
import { GetStartedPage } from "@/features/GetStartedPage";
import { RPCBuilder } from "@/features/RPCBuilder";
import { PTBBuilder } from "@/features/PTBBuilder";
import { HistoryFeature } from "@/features/History";
import { NewRequestPage } from "@/features/NewRequestPage";
import { ProfilePage } from "@/features/ProfilePage";
import { SettingsPage } from "@/features/SettingsPage";
import { AIChat } from "@/features/AIChat";
import { CollectionRunner } from "@/features/CollectionRunner";
import { FeaturesPage } from "@/features/FeaturesPage";
import { MoveBuilder } from "@/features/MoveBuilder";
import { Playground } from "@/features/Playground";
import { OTPPage } from "@/features/OTPPage";
import { IntegrationsPage } from "@/features/IntegrationsPage";
import { InfrastructurePage } from "@/features/InfrastructurePage";
import { PartnersPage } from "@/features/PartnersPage";


const MOCK_TEAM: TeamMember[] = [];

const networks = {
    mainnet: { url: getFullnodeUrl("mainnet") },
    testnet: { url: getFullnodeUrl("testnet") },
    devnet: { url: getFullnodeUrl("devnet") },
};

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            retry: 1,
        },
    },
});

// Component to render content based on active tab
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
            return <ProfilePage />;
        case 'ai_chat':
            return <AIChat />;
        case 'new_request':
            // FIXED: Added tabId prop
            return <NewRequestPage tabId={activeTab.id} initialData={activeTab.data} />;
        case 'runner':
            return <CollectionRunner collectionId={activeTab.data?.collectionId} />;
        case 'move':
            return <MoveBuilder />;
        case 'playground':
            return <Playground />;
        default:
            return <Dashboard />;
    }
};

const App: React.FC = () => {
    const {
        tabs,
        activeTabId,
        workspaces,
        currentWorkspaceId,
        collections,
        history,
        envVariables,
        isAuthModalOpen,
        user,
        connectedAddress,
        activityLogs,
        comments,
        network,
        viewMode,
    } = useAppStore();

    const [showEntrance, setShowEntrance] = useState(true);

    useEffect(() => {
        appStore.initialize();
    }, []);

    // Scroll to top on viewMode change
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [viewMode]);

    const currentWorkspace =
        workspaces.find((w) => w.id === currentWorkspaceId) || workspaces[0];

    if (viewMode === 'landing') {
        return (
            <QueryClientProvider client={queryClient}>
                <LandingPage />
            </QueryClientProvider>
        );
    }

    if (viewMode === 'docs') {
        return (
            <QueryClientProvider client={queryClient}>
                <DocsPage />
            </QueryClientProvider>
        );
    }

    if (viewMode === 'ecosystem') {
        return (
            <QueryClientProvider client={queryClient}>
                <EcosystemPage />
            </QueryClientProvider>
        );
    }

    if (viewMode === 'signin') {
        return (
            <QueryClientProvider client={queryClient}>
                <SignInPage />
            </QueryClientProvider>
        );
    }

    if (viewMode === 'signup') {
        return (
            <QueryClientProvider client={queryClient}>
                <GetStartedPage />
            </QueryClientProvider>
        );
    }

    if (viewMode === 'features') {
        return (
            <QueryClientProvider client={queryClient}>
                <FeaturesPage />
            </QueryClientProvider>
        );
    }

    if (viewMode === 'auth') {
        return (
            <QueryClientProvider client={queryClient}>
                <AuthPage />
            </QueryClientProvider>
        );
    }

    if (viewMode === 'otp') {
        return (
            <QueryClientProvider client={queryClient}>
                <OTPPage />
            </QueryClientProvider>
        );
    }

    if (viewMode === 'integrations') {
        return (
            <QueryClientProvider client={queryClient}>
                <IntegrationsPage />
            </QueryClientProvider>
        );
    }

    if (viewMode === 'infrastructure') {
        return (
            <QueryClientProvider client={queryClient}>
                <InfrastructurePage />
            </QueryClientProvider>
        );
    }

    if (viewMode === 'partners') {
        return (
            <QueryClientProvider client={queryClient}>
                <PartnersPage />
            </QueryClientProvider>
        );
    }

    return (            
        <QueryClientProvider client={queryClient}>
            <SuiClientProvider networks={networks} defaultNetwork="testnet">
                <WalletProvider>
                    {showEntrance && (
                        <EntranceAnimation
                            onComplete={() => setShowEntrance(false)}
                        />
                    )}

                    <div
                        className={`transition-opacity duration-1000 ${
                            showEntrance ? "opacity-0" : "opacity-100"
                        }`}
                    >
                        <Layout
                            sidebar={
                                <Sidebar
                                    currentWorkspace={currentWorkspace}
                                    workspaces={workspaces}
                                    collections={collections}
                                    history={history}
                                    envVariables={envVariables}
                                    activeTabId={activeTabId}
                                    onSwitchWorkspace={
                                        appStore.setWorkspace
                                    }
                                    onSelectRequest={(req) =>
                                        appStore.openTab(
                                            req.type === RequestType.RPC
                                                ? "rpc"
                                                : "ptb",
                                            req
                                        )
                                    }
                                    onSelectCollectionRequest={(node) => {
                                        if (node.requestData) {
                                            appStore.openTab(
                                                node.requestData.type === RequestType.RPC
                                                    ? "rpc"
                                                    : "ptb",
                                                node.requestData
                                            );
                                        }
                                    }}
                                    onNewRequest={() =>
                                        appStore.openTab("new_request")
                                    }
                                    onUpdateEnv={appStore.updateEnv}
                                    onToggleExpand={appStore.toggleCollectionExpand}
                                    onCreateCollection={appStore.createCollection}
                                    onCreateWorkspace={appStore.createWorkspace}
                                />
                            }
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
                </WalletProvider>
            </SuiClientProvider>
         </QueryClientProvider>
    );
};

export default App;
