import React, { useState } from 'react';
import { RequestPanelProps, ActiveTab } from './types';
import { HeaderBar } from './HeaderBar';
import { RequestTabs } from './RequestTabs';
import { RPCBuilder } from './builders/RPCBuilder';
import { TransactionEditor } from './builders/TransactionEditor';
import { TestsEditor } from './editors/TestsEditor';
import { HooksEditor } from './editors/HooksEditor';
import { RawEditor } from './editors/RawEditor';
import { CodeSnippet } from './editors/CodeSnippet';
import { HeadersEditor } from './editors/HeadersEditor';
import { AuthEditor } from './editors/AuthEditor';
import { AdvancedEditor } from './editors/AdvancedEditor';
import { TransactionNotice } from './editors/TransactionNotice';
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
  testResults = [],
  outcome = null,
  txProgress = null
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('builder');

  const chain = request.rpcParams.chain;
  const evmChainId = request.type === RequestType.RPC ? request.rpcParams.evmChainId : undefined;

  const handleTypeChange = (type: RequestType) => {
    onChange({ ...request, type });
  };

  const renderLeft = () => {
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

      case 'headers':
        return <HeadersEditor />;

      case 'auth':
        return <AuthEditor />;

      case 'advanced':
        return <AdvancedEditor chain={chain} />;

      case 'transaction':
        return request.type === RequestType.TRANSACTION ? (
          <TransactionEditor
            request={request}
            activeAddress={activeAddress}
            envVars={envVars}
            network={network}
            isReadOnly={isReadOnly}
            onChange={onChange}
            outcome={outcome}
            txProgress={txProgress}
            isLoading={isLoading}
          />
        ) : (
          <TransactionNotice onConvert={() => onChange({ ...request, type: RequestType.TRANSACTION })} />
        );

      case 'raw':
        return <RawEditor request={request} onChange={onChange} />;

      case 'builder':
      default:
        return request.type === RequestType.RPC ? (
          <div className="p-4 md:p-6 space-y-8">
            <RPCBuilder
              request={request}
              onChange={onChange}
            />
          </div>
        ) : (
          <TransactionEditor
            request={request}
            activeAddress={activeAddress}
            envVars={envVars}
            network={network}
            isReadOnly={isReadOnly}
            onChange={onChange}
            outcome={outcome}
            txProgress={txProgress}
            isLoading={isLoading}
          />
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
        evmChainId={evmChainId}
        request={request}
        outcome={outcome}
        onChange={onChange}
      />

      <RequestTabs
        activeTab={activeTab}
        requestType={request.type}
        testsCount={request.tests?.length || 0}
        testSummary={
          testResults.length > 0
            ? { passed: testResults.filter((r) => r.passed).length, total: testResults.length }
            : undefined
        }
        onTabChange={setActiveTab}
      />

      <div className="flex-1 overflow-auto bg-white dark:bg-dark-indigo-glow custom-scrollbar">
        {renderLeft()}
      </div>
    </div>
  );
};