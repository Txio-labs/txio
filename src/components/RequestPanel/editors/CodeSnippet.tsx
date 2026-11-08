import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { RequestItem, RequestType, Network } from '../../../types';
import { resolveChainRpcUrl } from '@/services/suiService';
import { getTxChain } from '@/services/transactionService';
import { APTOS_REST_METHODS } from '@/services/aptosRest';
import { getEvmChain } from '@/lib/constants';

interface CodeSnippetProps {
  request: RequestItem;
  network: Network;
}

/** Single-quotes a value for a POSIX shell. */
const sq = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`;

const rpcSnippet = (request: RequestItem, network: Network): string => {
  const chain = request.rpcParams.chain ?? 'sui';
  const { method, params } = request.rpcParams;

  if (chain === 'aptos') {
    const spec = APTOS_REST_METHODS[method];
    if (!spec) return `# Pick an Aptos method to generate a request.`;
    let path: string;
    try {
      path = spec.path(params);
    } catch (error) {
      return `# ${error instanceof Error ? error.message : 'Fill in the params to generate a request.'}`;
    }
    const url = `${resolveChainRpcUrl('aptos', network)}${path}`;
    if (spec.http === 'GET') return `curl ${sq(url)}`;
    return `curl -X POST ${sq(url)} \\\n  -H "Content-Type: application/json" \\\n  -d ${sq(JSON.stringify(spec.body?.(params) ?? {}, null, 2))}`;
  }

  const endpoint = resolveChainRpcUrl(chain, network, request.rpcParams.evmChainId);
  // Soroban RPC takes one params object, not a positional array (same unwrap as executeChainRpc).
  const bodyParams = chain === 'stellar' ? (params[0] ?? {}) : params;
  const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method, params: bodyParams }, null, 2);
  return `curl -X POST ${endpoint} \\\n  -H "Content-Type: application/json" \\\n  -d ${sq(body)}`;
};

const APTOS_CLI_TYPE: Record<string, string> = {
  string: 'string',
  'vector<u8>': 'hex',
  object: 'address'
};

const transactionSnippet = (request: RequestItem, network: Network): string => {
  const chain = getTxChain(request);

  switch (chain) {
    case 'evm': {
      const p = request.evmTxParams;
      if (!p) return '# Fill in the transaction to generate a command.';
      const rpc = getEvmChain(p.chainId).rpcUrl;
      const value = p.value && Number(p.value) > 0 ? ` \\\n  --value ${p.value}ether` : '';
      if (p.deploy) {
        return `cast send --create ${p.data || '<bytecode>'}${value} \\\n  --rpc-url ${rpc} \\\n  --private-key $PRIVATE_KEY`;
      }
      const call = p.functionSignature
        ? `${sq(p.functionSignature)}${p.args.map((a) => ` ${sq(a)}`).join('')}`
        : p.data || '0x';
      return `cast send ${p.to || '<to address>'} ${call}${value} \\\n  --rpc-url ${rpc} \\\n  --private-key $PRIVATE_KEY`;
    }

    case 'aptos': {
      const p = request.aptosTxParams;
      if (!p) return '# Fill in the entry function to generate a command.';
      const lines = [`aptos move run`, `  --function-id ${p.moduleAddress || '<address>'}::${p.module || '<module>'}::${p.function || '<function>'}`];
      const typeArgs = p.typeArguments.filter(Boolean);
      if (typeArgs.length) lines.push(`  --type-args ${typeArgs.join(' ')}`);
      if (p.arguments.length) {
        lines.push(`  --args ${p.arguments.map((a) => sq(`${APTOS_CLI_TYPE[a.type] ?? a.type}:${a.value}`)).join(' ')}`);
      }
      lines.push(`  --url ${resolveChainRpcUrl('aptos', network)}`);
      return lines.join(' \\\n');
    }

    case 'stellar': {
      const p = request.stellarTxParams;
      if (!p) return '// Fill in the contract call to generate code.';
      const args = p.args.map((a) => `  nativeToScVal(${JSON.stringify(a.value)}, { type: ${JSON.stringify(a.type)} })`).join(',\n');
      return [
        `import { Contract, nativeToScVal, rpc } from '@stellar/stellar-sdk';`,
        ``,
        `const server = new rpc.Server(${JSON.stringify(resolveChainRpcUrl('stellar', network))});`,
        `const op = new Contract(${JSON.stringify(p.contractId || '<C… contract id>')}).call(`,
        `  ${JSON.stringify(p.function || '<function>')}${args ? `,\n${args}` : ''}`,
        `);`,
        `// Add \`op\` to a TransactionBuilder, then simulate, sign and send via \`server\`.`
      ].join('\n');
    }

    case 'solana': {
      const p = request.solanaTxParams;
      if (!p) return '// Fill in the instruction to generate code.';
      const keys = p.accounts
        .map((a) => `    { pubkey: new PublicKey(${JSON.stringify(a.pubkey || '<pubkey>')}), isSigner: ${a.isSigner}, isWritable: ${a.isWritable} }`)
        .join(',\n');
      return [
        `import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';`,
        ``,
        `const connection = new Connection(${JSON.stringify(resolveChainRpcUrl('solana', network))});`,
        `const ix = new TransactionInstruction({`,
        `  programId: new PublicKey(${JSON.stringify(p.programId || '<program id>')}),`,
        `  keys: [\n${keys}\n  ],`,
        `  data: Buffer.from(${JSON.stringify(p.data)}, ${JSON.stringify(p.dataEncoding === 'utf8' ? 'utf8' : p.dataEncoding)}),`,
        `});`,
        `const tx = new Transaction().add(ix);`,
        `// Sign with your wallet, then: await connection.sendRawTransaction(signed.serialize());`
      ].join('\n');
    }

    default: {
      const { packageId, module, function: func, typeArguments, arguments: args, gasBudget } = request.moveParams;
      const lines = [
        `sui client call`,
        `  --package ${packageId || '<package id>'}`,
        `  --module ${module || '<module>'}`,
        `  --function ${func || '<function>'}`,
        `  --gas-budget ${gasBudget}`
      ];
      const typeArgs = typeArguments.filter(Boolean);
      if (typeArgs.length) lines.push(`  --type-args ${typeArgs.join(' ')}`);
      if (args.length) lines.push(`  --args ${args.map((a) => sq(String(a.value))).join(' ')}`);
      return lines.join(' \\\n');
    }
  }
};

export const buildSnippet = (request: RequestItem, network: Network): string =>
  request.type === RequestType.RPC ? rpcSnippet(request, network) : transactionSnippet(request, network);

export const CodeSnippet: React.FC<CodeSnippetProps> = ({ request, network }) => {
  const [isCopied, setIsCopied] = useState(false);
  const snippet = buildSnippet(request, network);

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(snippet);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex justify-end mb-4">
        <button
          onClick={handleCopySnippet}
          className="h-[28px] px-3 bg-surface text-fg-muted border border-line hover:bg-hover hover:text-fg rounded-lg text-[12px] font-semibold transition-all flex items-center gap-2"
        >
          {isCopied ? <Check size={12} /> : <Copy size={12} />}
          {isCopied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="bg-surface p-4 sm:p-6 rounded-[10px] border border-line text-fg-muted font-mono text-[12px] overflow-x-auto whitespace-pre-wrap break-all select-text leading-relaxed">
        {snippet}
      </pre>
    </div>
  );
};
