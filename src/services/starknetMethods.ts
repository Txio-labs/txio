/**
 * Every Starknet JSON-RPC method TXIO offers, with what a developer needs to
 * know before sending it. The list is the Starknet RPC specification v0.10.3
 * (starkware-libs/starknet-specs, api/*.json): the read API, the trace API,
 * the write API and the executables API. starknetMethods.test.ts checks it against
 * the spec's method list and parameter order (starknetSpec-0.10.3.json,
 * extracted from those files), so a method can be neither
 * invented nor dropped.
 *
 * The WebSocket subscription API (starknet_subscribe*) is not here: it only
 * runs over WebSocket, and providers reject it over HTTP (verified on
 * PublicNode: -32601).
 *
 * Templates are positional params in the spec's parameter order. Block ids
 * use the 0.10 tags: "latest", "pre_confirmed" or "l1_accepted". "pending"
 * no longer exists.
 */

export const STARKNET_SPEC_VERSION = '0.10.3';

const SPEC_URL = 'https://github.com/starkware-libs/starknet-specs/blob/v0.10.3/api';
const READ_DOC = `${SPEC_URL}/starknet_api_openrpc.json`;
const TRACE_DOC = `${SPEC_URL}/starknet_trace_api_openrpc.json`;
const WRITE_DOC = `${SPEC_URL}/starknet_write_api.json`;
const EXEC_DOC = `${SPEC_URL}/starknet_executables.json`;

export type StarknetMethodGroup =
    | 'General'
    | 'Blocks'
    | 'Transactions'
    | 'Contracts and state'
    | 'Execution and fees'
    | 'Trace'
    | 'Messaging'
    | 'Proofs'
    | 'Write';

export type StarknetApi = 'read' | 'trace' | 'write' | 'executables';

export interface StarknetMethod {
    name: string;
    api: StarknetApi;
    group: StarknetMethodGroup;
    /** One line: what the method returns or does. */
    summary: string;
    /** Parameter names in spec order, for the editor's hints. Optional ones end with "?". */
    params: string[];
    template: unknown[];
    /**
     * False for methods that submit a transaction. Those are sent once, to
     * the first endpoint only, and never retried or failed over: a timeout
     * does not mean the node rejected the transaction.
     */
    readOnly: boolean;
    docs: string;
}

const ADDRESS = '<0x contract address>';
const TX_HASH = '<0x transaction hash>';
const CLASS_HASH = '<0x class hash>';
const ACCOUNT = '<0x account address>';

// v3 resource bounds with zero maximums: valid shape, and what simulation with SKIP_FEE_CHARGE accepts.
const ZERO_BOUNDS = {
    l1_gas: { max_amount: '0x0', max_price_per_unit: '0x0' },
    l1_data_gas: { max_amount: '0x0', max_price_per_unit: '0x0' },
    l2_gas: { max_amount: '0x0', max_price_per_unit: '0x0' },
};

const V3_COMMON = {
    resource_bounds: ZERO_BOUNDS,
    tip: '0x0',
    paymaster_data: [],
    nonce_data_availability_mode: 'L1',
    fee_data_availability_mode: 'L1',
};

const UNSIGNED_INVOKE = {
    type: 'INVOKE',
    version: '0x3',
    sender_address: ACCOUNT,
    calldata: ['<0x felt>'],
    signature: [],
    nonce: '<0x nonce>',
    account_deployment_data: [],
    ...V3_COMMON,
};

const read = (
    name: string,
    group: StarknetMethodGroup,
    summary: string,
    params: string[],
    template: unknown[]
): StarknetMethod => ({ name, api: 'read', group, summary, params, template, readOnly: true, docs: READ_DOC });

export const STARKNET_METHODS: readonly StarknetMethod[] = [
    // General
    read('starknet_specVersion', 'General', 'The RPC specification version the node implements.', [], []),
    read('starknet_chainId', 'General', 'The chain id as a hex short string (SN_MAIN, SN_SEPOLIA).', [], []),
    read('starknet_syncing', 'General', 'Sync progress, or false when the node is in sync.', [], []),
    read('starknet_blockNumber', 'General', 'The latest block number.', [], []),
    read('starknet_blockHashAndNumber', 'General', 'The latest block hash and number.', [], []),

    // Blocks
    read('starknet_getBlockWithTxHashes', 'Blocks', 'A block header with its transaction hashes.', ['block_id'], ['latest']),
    read('starknet_getBlockWithTxs', 'Blocks', 'A block header with its full transactions.', ['block_id', 'response_flags?'], ['latest']),
    read('starknet_getBlockWithReceipts', 'Blocks', 'A block with every transaction and its receipt.', ['block_id', 'response_flags?'], ['latest']),
    read('starknet_getBlockTransactionCount', 'Blocks', 'The number of transactions in a block.', ['block_id'], ['latest']),
    read('starknet_getStateUpdate', 'Blocks', 'The state diff a block applied: storage, nonces, deployed and declared classes.', ['block_id', 'contract_addresses?'], ['latest']),

    // Transactions
    read('starknet_getTransactionByHash', 'Transactions', 'A transaction by hash.', ['transaction_hash', 'response_flags?'], [TX_HASH]),
    read('starknet_getTransactionByBlockIdAndIndex', 'Transactions', 'A transaction by block and position.', ['block_id', 'index', 'response_flags?'], ['latest', 0]),
    read('starknet_getTransactionReceipt', 'Transactions', 'The receipt: fee, events, messages, execution resources, status.', ['transaction_hash'], [TX_HASH]),
    read('starknet_getTransactionStatus', 'Transactions', 'Finality and execution status of a transaction.', ['transaction_hash'], [TX_HASH]),

    // Contracts and state
    read('starknet_call', 'Contracts and state', 'Calls a view function without a transaction.', ['request', 'block_id'], [
        // STRK balanceOf(<account>): selector is sn_keccak("balanceOf").
        {
            contract_address: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
            entry_point_selector: '0x2e4263afad30923c891518314c3c95dbe830a16874e8abc5777a9a20b54c76e',
            calldata: [ACCOUNT],
        },
        'latest',
    ]),
    read('starknet_getStorageAt', 'Contracts and state', 'The value at a storage key of a contract.', ['contract_address', 'key', 'block_id', 'response_flags?'], [ADDRESS, '<0x storage key>', 'latest']),
    read('starknet_getNonce', 'Contracts and state', 'The nonce of an account contract.', ['block_id', 'contract_address'], ['latest', ACCOUNT]),
    read('starknet_getClassHashAt', 'Contracts and state', 'The class hash a contract was deployed from.', ['block_id', 'contract_address'], ['latest', ADDRESS]),
    read('starknet_getClassAt', 'Contracts and state', 'The class (Sierra program and ABI) of a deployed contract.', ['block_id', 'contract_address'], ['latest', ADDRESS]),
    read('starknet_getClass', 'Contracts and state', 'A declared class by class hash.', ['block_id', 'class_hash'], ['latest', CLASS_HASH]),
    read('starknet_getEvents', 'Contracts and state', 'Events matching a filter, one page at a time (pass continuation_token for the next page).', ['filter'], [
        { from_block: 'latest', to_block: 'latest', address: ADDRESS, keys: [], chunk_size: 10 },
    ]),

    // Execution and fees
    read('starknet_estimateFee', 'Execution and fees', 'Fee estimate for transactions, in FRI. SKIP_VALIDATE lets an unsigned transaction be estimated.', ['request', 'simulation_flags', 'block_id'], [
        [UNSIGNED_INVOKE],
        ['SKIP_VALIDATE'],
        // The node checks the nonce against pre-confirmed state; use the pre-confirmed nonce and block.
        'pre_confirmed',
    ]),
    read('starknet_estimateMessageFee', 'Execution and fees', 'L2 fee estimate for an L1 to L2 message handler.', ['message', 'block_id'], [
        { from_address: '<0x L1 address>', to_address: ADDRESS, entry_point_selector: '<0x l1_handler selector>', payload: [] },
        'latest',
    ]),

    // Messaging and proofs
    read('starknet_getMessagesStatus', 'Messaging', 'Status of the L2 transactions an L1 transaction sent messages to.', ['transaction_hash'], ['<0x L1 transaction hash>']),
    read('starknet_getStorageProof', 'Proofs', 'Merkle paths for classes, contracts and storage keys. Raw RPC data: TXIO does not verify it.', [
        'block_id',
        'class_hashes?',
        'contract_addresses?',
        'contracts_storage_keys?',
    ], ['latest', [], [ADDRESS], []]),

    // Trace
    {
        name: 'starknet_traceTransaction',
        api: 'trace',
        group: 'Trace',
        summary: 'The execution trace of a transaction: calls, events, messages, resources. Some nodes do not keep old traces.',
        params: ['transaction_hash'],
        template: [TX_HASH],
        readOnly: true,
        docs: TRACE_DOC,
    },
    {
        name: 'starknet_simulateTransactions',
        api: 'trace',
        group: 'Trace',
        summary: 'Runs transactions against a block without submitting them. Results are simulated, not on-chain.',
        params: ['block_id', 'transactions', 'simulation_flags'],
        template: ['pre_confirmed', [UNSIGNED_INVOKE], ['SKIP_VALIDATE', 'SKIP_FEE_CHARGE']],
        readOnly: true,
        docs: TRACE_DOC,
    },
    {
        name: 'starknet_traceBlockTransactions',
        api: 'trace',
        group: 'Trace',
        summary: 'Traces of every transaction in a block.',
        params: ['block_id', 'trace_flags?'],
        template: ['latest'],
        readOnly: true,
        docs: TRACE_DOC,
    },

    // Executables
    {
        name: 'starknet_getCompiledCasm',
        api: 'executables',
        group: 'Contracts and state',
        summary: 'The compiled CASM of a declared Sierra class.',
        params: ['class_hash'],
        template: [CLASS_HASH],
        readOnly: true,
        docs: EXEC_DOC,
    },

    // Write: submit a signed transaction.
    {
        name: 'starknet_addInvokeTransaction',
        api: 'write',
        group: 'Write',
        summary: 'Submits a signed invoke transaction. Sent once, never retried.',
        params: ['invoke_transaction'],
        template: [{ ...UNSIGNED_INVOKE, signature: ['<0x r>', '<0x s>'] }],
        readOnly: false,
        docs: WRITE_DOC,
    },
    {
        name: 'starknet_addDeclareTransaction',
        api: 'write',
        group: 'Write',
        summary: 'Submits a signed declare transaction for a Sierra class. Sent once, never retried.',
        params: ['declare_transaction'],
        template: [
            {
                type: 'DECLARE',
                version: '0x3',
                sender_address: ACCOUNT,
                compiled_class_hash: '<0x compiled class hash>',
                signature: ['<0x r>', '<0x s>'],
                nonce: '<0x nonce>',
                contract_class: '<Sierra contract class object>',
                account_deployment_data: [],
                ...V3_COMMON,
            },
        ],
        readOnly: false,
        docs: WRITE_DOC,
    },
    {
        name: 'starknet_addDeployAccountTransaction',
        api: 'write',
        group: 'Write',
        summary: 'Submits a signed deploy-account transaction. Sent once, never retried.',
        params: ['deploy_account_transaction'],
        template: [
            {
                type: 'DEPLOY_ACCOUNT',
                version: '0x3',
                signature: ['<0x r>', '<0x s>'],
                nonce: '0x0',
                contract_address_salt: '<0x salt>',
                constructor_calldata: ['<0x public key>'],
                class_hash: '<0x account class hash>',
                ...V3_COMMON,
            },
        ],
        readOnly: false,
        docs: WRITE_DOC,
    },
];

const BY_NAME = new Map(STARKNET_METHODS.map((m) => [m.name, m]));

export const getStarknetMethod = (name: string): StarknetMethod | undefined => BY_NAME.get(name);

/** True for a method the registry marks as submitting a transaction. */
export const isStarknetWriteMethod = (name: string): boolean => BY_NAME.get(name)?.readOnly === false;
