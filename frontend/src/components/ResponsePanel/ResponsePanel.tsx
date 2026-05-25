import React, { useState, useMemo } from 'react';
import { Copy } from 'lucide-react';
import { ResponsePanelProps, ViewMode, ContentTab } from './types';
import { ResponseHeader } from './ResponseHeader';
import { ResponseTabs } from './ResponseTabs';
import { LoadingState } from './LoadingState';
import { PrettyView } from './veiws/PrettyView';
import { RawView } from './veiws/RawView';
import { MetaView } from './veiws/MetaView';
import { EventsView } from './veiws/EventsView';
import { EffectsView } from './veiws/EffectsView';
import {
  runAssertions,
  getTransactionDigest,
  getGasSummary,
  hasEvents,
  hasEffects
} from './utils/testUtils';
import { useAppStore } from '@/lib/store';
import { getSuiTransactionExplorerUrl } from '@/lib/appConfig';

export const ResponsePanel: React.FC<ResponsePanelProps> = ({ 
  request,
  response, 
  status, 
  duration, 
  isLoading, 
  error,
  endpoint
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<ContentTab>('body');
  const [viewMode, setViewMode] = useState<ViewMode>('pretty');
  const { network, settings } = useAppStore();

  // Memoized computations
  const txDigest = useMemo(() => getTransactionDigest(response), [response]);
  const txExplorerUrl = useMemo(
    () =>
      txDigest
        ? getSuiTransactionExplorerUrl(
            txDigest,
            network,
            settings.explorer
          )
        : null,
    [network, settings.explorer, txDigest]
  );
  const gasSummary = useMemo(() => getGasSummary(response), [response]);
  const eventsPresent = useMemo(() => hasEvents(response), [response]);
  const effectsPresent = useMemo(() => hasEffects(response), [response]);
  
  const testResults = useMemo(
    () => runAssertions(request?.tests, response, status, error),
    [request?.tests, response, status, error]
  );

  const handleCopy = () => {
    const content = error ? error : JSON.stringify(response, null, 2);
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isError = status ? status >= 400 : !!error;
  const hasContent =
    isLoading ||
    response !== null && response !== undefined ||
    !!error;

  if (isLoading) {
    return <LoadingState />;
  }

  if (!hasContent) {
    return null;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'body':
        return viewMode === 'pretty' ? (
          <PrettyView
            response={response}
            isError={isError}
            endpoint={endpoint}
            onCopy={handleCopy}
            copied={copied}
          />
        ) : (
          <RawView response={response} />
        );
      
      case 'meta':
        return (
          <MetaView
            endpoint={endpoint}
            status={status}
            testResults={testResults}
            gasSummary={gasSummary}
          />
        );
      
      case 'events':
        const events = response?.events || response?.result?.events || [];
        return <EventsView events={events} />;
      
      case 'effects':
        const effects = response?.effects || response?.result?.effects || [];
        return <EffectsView effects={effects} />;
      
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-near-black border-t border-white/10">
      <ResponseHeader
        isError={isError}
        duration={duration}
        testResults={testResults}
        txDigest={txDigest}
        txExplorerUrl={txExplorerUrl}
        viewMode={viewMode}
        onViewModeChange={(mode) => setViewMode(mode as ViewMode)}
      />

      <ResponseTabs
        activeTab={activeTab}
        hasEvents={eventsPresent}
        hasEffects={effectsPresent}
        onTabChange={setActiveTab}
      />

      <div className="flex-1 overflow-auto bg-dark-indigo-glow p-6 custom-scrollbar">
        {renderContent()}
      </div>
    </div>
  );
};
