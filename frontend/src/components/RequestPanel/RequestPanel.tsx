import React, { useState } from 'react';
import { RequestPanelProps, ActiveTab } from './types';
import { HeaderBar } from './HeaderBar';
import { RequestTabs } from './RequestTabs';
import { RPCBuilder } from './builders/RPCBuilder';
import { TransactionBuilder } from './builders/TransactionBuilder';
import { TestsEditor } from './editors/TestsEditor';
import { HooksEditor } from './editors/HooksEditor';
import { RawEditor } from './editors/RawEditor';
import { CodeSnippet } from './editors/CodeSnippet';
import { RequestType } from '../../types';

export const RequestPanel: React.FC<RequestPanelProps> = ({ 
  request, 
  network,
  isLoading,
  onChange, 
  onSend,
  onExecute,
  activeAddress,
  envVars,
  isReadOnly = false,
  testResults = []
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('builder');

  const chain = request.type === RequestType.RPC ? request.rpcParams.chain : undefined;

  const handleTypeChange = (type: RequestType) => {
    onChange({ ...request, type });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'code':
        return <CodeSnippet request={request} network={network} />;
      
      case 'tests':
        return (
          <TestsEditor
            tests={request.tests || []}
            onChange={(tests) => onChange({ ...request, tests })}
            results={testResults}
          />
        );
      
      case 'hooks':
        return (
          <HooksEditor
            hooks={request.hooks || []}
            onChange={(hooks) => onChange({ ...request, hooks })}
          />
        );
      
      case 'raw':
        return <RawEditor request={request} onChange={onChange} />;
      
      case 'builder':
      default:
        return (
          <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-8">
            {request.type === RequestType.RPC ? (
              <RPCBuilder 
                request={request}
                onChange={onChange}
              />
            ) : (
              <TransactionBuilder 
                request={request}
                activeAddress={activeAddress}
                envVars={envVars}
                network={network}
                isReadOnly={isReadOnly}
                onChange={onChange}
              />
            )}
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-near-black relative font-sans">
      <HeaderBar 
        requestType={request.type}
        network={network}
        isLoading={isLoading}
        activeAddress={activeAddress}
        onTypeChange={handleTypeChange}
        onSend={onSend}
        onExecute={onExecute}
        chain={chain}
      />

      <RequestTabs
        activeTab={activeTab}
        testsCount={request.tests?.length || 0}
        testSummary={
          testResults.length > 0
            ? { passed: testResults.filter((r) => r.passed).length, total: testResults.length }
            : undefined
        }
        onTabChange={setActiveTab}
      />

      <div className="flex-1 overflow-auto bg-white dark:bg-dark-indigo-glow custom-scrollbar">
        {renderContent()}
      </div>
    </div>
  );
};