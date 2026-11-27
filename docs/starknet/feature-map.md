# Starknet integration: audit and requirement map

Stage 1 of the Starknet integration spec. It records what TXIO already does for Starknet, what each spec part needs, and where that work goes. It is the checklist the spec's Part 33 asks for: update each row's status as work lands.

Audited on 2026-11-27 against:

- frontend `feat/starknet-workspace` (based on `feat/chain-workspaces` 3a5c35e)
- backend `feat/stellar-contract-indexer` 3a44b5f
- `txio-cli` (working copy, not a git repository)
- `txio-sdk` 0.2.0

## Status labels

The labels are the ones from spec Part 32, plus **Exists**, meaning the feature was already in TXIO before this work.

- **Exists**
- **Implemented and tested**
- **Implemented but not integration-tested**
- **Partially implemented**
- **Blocked by provider/protocol**
- **Unsupported**
- **Not started**

## 1. Protocol facts verified

| Fact | Source | How it was checked |
|---|---|---|
| Current RPC spec is 0.10.3. Tags up to v0.10.5 exist. | `starkware-libs/starknet-specs` tags | GitHub API |
| PublicNode mainnet and Sepolia serve `starknet_specVersion` = `0.10.3`. | `starknet-rpc.publicnode.com`, `starknet-sepolia-rpc.publicnode.com` | Live call |
| Read API has 25 methods. They include `getStorageProof`, `getMessagesStatus` and `getBlockWithReceipts`. | `api/starknet_api_openrpc.json` @ v0.10.3 | Spec file |
| Trace API has 3 methods: `traceTransaction`, `simulateTransactions` and `traceBlockTransactions`. | `api/starknet_trace_api_openrpc.json` | Spec file |
| Write API has 3 methods: `addInvokeTransaction`, `addDeclareTransaction` and `addDeployAccountTransaction`. | `api/starknet_write_api.json` | Spec file |
| Executables API has `starknet_getCompiledCasm`. | `api/starknet_executables.json` | Spec file, and live: the method exists |
| A WebSocket API is part of the spec: `subscribeNewHeads`, `subscribeEvents`, `subscribeTransactionStatus`, `subscribeNewTransactionReceipts`, `subscribeNewTransactions`, `unsubscribe`, and reorg notifications. This is not `eth_subscribe`. | `api/starknet_ws_api.json` | Spec file |
| PublicNode serves the WebSocket API on `wss://starknet-rpc.publicnode.com` and `wss://starknet-sepolia-rpc.publicnode.com`. | Live | `subscribeNewHeads` returned a subscription id and new-head notifications |
| PublicNode HTTP does not serve subscriptions: `subscribeNewHeads` over HTTP returns -32601. | Live | Expected: subscriptions are WebSocket only |
| Block tags are `latest`, `pre_confirmed` and `l1_accepted`. `pending` no longer exists. | `BLOCK_TAG` schema | Spec file |
| Finality is `PRE_CONFIRMED`, `ACCEPTED_ON_L2` or `ACCEPTED_ON_L1`. Execution is `SUCCEEDED` or `REVERTED`. | Schemas | Spec file |
| Fee estimates are in FRI (STRK) only. Resource bounds are `l1_gas`, `l1_data_gas` and `l2_gas`. | `FEE_ESTIMATE`, `RESOURCE_BOUNDS_MAPPING` | Spec file |
| Chain ids are `SN_MAIN` = `0x534e5f4d41494e` and `SN_SEPOLIA` = `0x534e5f5345504f4c4941`. | Live `starknet_chainId` | Matches `services/starknet.ts` |

**Consequence:** the spec's "Pending State" section maps to the `pre_confirmed` tag. A UI that sends `pending` would be wrong on 0.10.

## 2. What already exists

### Frontend (`Txio-frontend`)

| Area | File | What it does |
|---|---|---|
| Shared helpers | `src/services/starknet.ts` | Chain ids, address and felt validation, lazy `starknet` 10.8.0 loader, provider built on the custom-RPC failover list, ABI fetch with cache (Cairo 0 and Sierra), ABI function listing, calldata compile through starknet.js `CallData`, unsigned v3 multicall simulation (`SKIP_VALIDATE`, `SKIP_FEE_CHARGE`), revert reason, STRK balance |
| Transaction adapter | `src/services/adapters/starknetAdapter.ts` | `ChainAdapter`: validate, describe, simulate, execute (wallet signs `wallet_addInvokeTransaction`), wait for receipt, typed `ChainExecutionError` |
| Transaction builder UI | `src/components/RequestPanel/builders/StarknetTransactionBuilder.tsx` | Multicall builder: add calls, raw or ABI calldata, ABI function picker |
| Wallets | `src/wallet/starknet.ts` | Ready (Argent) and Braavos through `@starknet-io/get-starknet-core` 6.1.0: connect, restore, disconnect, chain detection, `wallet_switchStarknetChain`, invoke signing with timeouts |
| Contract discovery | `src/services/discovery/starknetDiscovery.ts` | Functions from the on-chain class ABI |
| Declare and deploy | `src/services/deploy.ts` `deployStarknet` | Declare the Sierra and CASM class, then deploy through the wallet. Compiled class hash via starknet.js. The Contracts page that uses it is currently hidden behind `ComingSoonPage`. |
| Compile | `src/services/compile/remote.ts` | Sends Cairo source to the backend compiler (Scarb) |
| Contract templates | `src/features/contractTemplates/starknet.ts` | Starter Cairo contracts |
| Explorer | `src/features/StarknetExplorer.tsx`, `src/services/starknetExplorer.ts` | Latest block, transaction lookup (type, status, fee, events count), account lookup (nonce, class hash, STRK balance) |
| History | `src/services/transactionHistory.ts` | Account history from STRK `Transfer` events through `starknet_getEvents`, labelled `starknet-rpc` |
| Names | `src/services/nameResolution/starknetId.ts` | starknet.id resolution |
| RPC workspace | `src/lib/constants.ts` | 14 `starknet_*` methods plus `getAddressTransactions`, with templates |
| Generic RPC engine | `src/services/suiService.ts` `executeChainRpc` / `postJsonRpcWithFailover` | Ordered endpoint failover, timeout, timing |
| Endpoints | `src/features/NetworksPage.tsx`, `AppSettings.starknetCustomRpc` | Custom RPC URLs per network, tried in order |
| Shared platform | Collections, environments, history, assertions (`lib/assertionsEngine.ts`), collection runner, hooks, workspaces and roles, comments, webhooks / API keys / scheduled tasks UI (`features/automation`) | Chain-neutral |
| Chain workspace | `src/chains/registry.ts` (`starknet`, `topbar` layout) | Starknet has its own workspace |

### Backend (`txio-backend`)

| Area | What it does |
|---|---|
| Compiler | `compiler/` builds Cairo with Scarb 2.21.0, with resource limits and source checks |
| Webhooks | `services/webhook_service.rs`: signed payloads with timestamp (replay window), retry schedule, delivery records, dead after the last retry. SSRF guard in `utils/url_safety.rs`. Events are a fixed list: `tx.confirmed`, `tx.failed`, `swap.resumable`, `session_key.expiring`, `spend_limit.reached`. |
| Indexer pattern | `services/stellar_indexer.rs`: a worker that tails Soroban contract events into Mongo. This is the model to follow for Starknet event monitors. |
| Public API | `/v1` history, simulate, execute (EVM only, session-key signer), OpenAPI, API keys with scopes, rate limits |
| Starknet-specific | Only the `starknet` value in history and OpenAPI enums. No Starknet service. |

### CLI (`txio-cli`) and SDK (`txio-sdk`)

- **CLI:** `txio starknet` (alias `strk`) supports `call`, `balance`, `tx`, `object`, `history`, `gas`, `simulate` and `block`. `txio run` runs collections against several networks with `expect` checks and writes JSON or Markdown reports, and `action.yml` wraps it for GitHub Actions.
- **SDK:** a typed client for the public API. Its `Chain` type has no `starknet`. It has no chain clients.

## 3. Gaps and defects found

| # | Finding | Effect |
|---|---|---|
| G1 | `starknetExplorer.ts` posts to `STARKNET_NETWORKS[network]` and ignores custom RPC endpoints. | The explorer ignores user endpoints and failover. |
| G2 | The RPC method list has 14 of the 32 spec methods. Missing: `getBlockWithTxs`, `getBlockWithReceipts`, `getStateUpdate`, `getTransactionByBlockIdAndIndex`, `getBlockTransactionCount`, `blockHashAndNumber`, `getClass`, `getStorageProof`, `getMessagesStatus`, `estimateFee`, `estimateMessageFee`, the 3 trace methods, the 3 write methods and `getCompiledCasm`. | Developers cannot reach most of the API from templates. |
| G3 | No method registry. There is no record of read versus write, retry safety, spec version or docs link. | The spec's Part 3.2 is unmet. |
| G4 | Simulation uses zero resource bounds and skips fee charge, but shows no fee breakdown, resource bounds editor or `estimateFee` result. | The spec's Part 7.2 and Part 14 are unmet. |
| G5 | No ABI import (file or paste). The ABI comes only from the chain. No events, structs or enums view. No return value decoding for reads. | Cairo Studio is missing. |
| G6 | No calldata, felt, u256, ByteArray or selector tools. | The spec's Part 5.3 is unmet. |
| G7 | The explorer has no block, class, state update or storage views, no trace or event decoding, and shows raw JSON only through the RPC builder. | The spec's Part 6 and Part 10 are thin. |
| G8 | No WebSocket client and no monitors. | Part 12 is unmet, although the provider supports subscriptions. |
| G9 | Webhook events are a fixed list with no chain event types, and no Starknet monitor feeds them. | Part 13 is only covered for transaction confirmations. |
| G10 | No custom headers or auth for RPC endpoints (URL list only). | Keyed providers that need headers cannot be used, only providers with the key in the URL. |
| G11 | No JSON-RPC batch support in `postJsonRpcWithFailover`. | Part 3.3 batch is unmet. |
| G12 | Contracts page is hidden (`ComingSoonPage`), so declare and deploy cannot be reached. | Existing code is unreachable. |
| G13 | The SDK has no `starknet` chain, and the public API simulates and executes only EVM. | Parts 21 and 23 are unmet. |
| G14 | No L1 to L2 messaging view, although `getMessagesStatus` exists in 0.10. | Part 11 is unmet. |
| G15 | No `getStorageProof` UI. Proof verification is not implemented anywhere. | Part 17 is unmet. |

## 4. Requirement map

| Part | Requirement | Status | Target and files |
|---|---|---|---|
| 1 | Audit and mapping | Implemented | This document |
| 2.1 | Mainnet, Sepolia, local (`starknet-devnet` :5050), custom | Partially implemented | Exists through `STARKNET_NETWORKS` and custom RPC. Add chain-id verification on save. |
| 2.2 | Endpoint management: add, edit, delete, priority, failover | Partially implemented | Exists as ordered URL lists. Add per-endpoint label, timeout and identity check (`starknet_chainId` + `specVersion`). Headers are blocked by G10 and need a design decision. |
| 2.3 | Network info: chain id, spec version, latest block, sync status | Partially implemented | Chain home shows block and latency. Add spec version, `syncing`, last success and last error from real calls. |
| 3.1 | Request builder | Implemented and tested | Every spec method listed with a summary, its parameters in spec order, a spec link, and a warning on methods that submit a transaction (`StarknetMethodInfo.tsx`) |
| 3.2 | All 0.10.3 methods, with a capability record each | Implemented and tested | `src/services/starknetMethods.ts`: the 32 HTTP methods (read, trace, write, executables), each with API, group, summary, params, template, read-only flag and docs link. `starknetMethods.test.ts` checks names, APIs and parameter order against the spec fixture. `starknetMethods.live.test.ts` ran every read, trace and executables method on Sepolia and mainnet (see section 8). Not recorded per method yet: provider support per endpoint (Stage 10). |
| 3.3 | Batch, cancellation, retry for reads only, failover, diffing | Partially implemented | Done: reads fail over across endpoints; submissions go to the first endpoint only and are never retried (`rpcRetrySafety.ts`, all chains); RPC error codes are kept (`SuiRpcError.rpcCode`); non-JSON provider pages count as provider failures. Not started: batch, diffing. |
| 4 | Provider workspace: compare, latency, capability checks | Not started | A Starknet providers page built on the registry. Measures with real calls only. |
| 5.1–5.4 | Cairo Studio: ABI import and view, types, calldata tools, function calls | Partially implemented | Exists: chain ABI and encoding. New: ABI paste/upload, interface/struct/enum/event views, typed forms, read calls with decoded return values, selector, felt, u256 and ByteArray tools, all through starknet.js `CallData`, `hash`, `num` and `byteArray` |
| 5.5 | Scarb, Foundry, Devnet, Sierra/CASM artifacts | Partially implemented | Exists: backend Scarb compile. New: import Sierra/CASM JSON, compute class hash and compiled class hash locally, compare with chain (`getClassHashAt`, `getCompiledCasm`) |
| 6.1–6.2 | Contract explorer: class, ABI, entry points, storage | Partially implemented | Extend the explorer with a contract view: class hash, `getClass`, entry points, ABI and storage reads |
| 6.3 | Verification | Not started | Only a local class-hash match of uploaded artifacts against the chain, labelled as a hash match and not source verification. External verifiers only if they have a documented API. |
| 6.4 | Storage explorer | Not started | `getStorageAt` with `sn_keccak` variable-name key derivation, and block-to-block comparison |
| 7.1–7.3 | Invoke, declare, deploy account; nonce, version, resource bounds; simulate and estimate | Partially implemented | Exists: invoke multicall plus simulation. New: `estimateFee`, a resource-bounds editor, payload preview, and a "Simulated" label on results |
| 7.4 | Signing and submission | Exists | Explicit wallet approval; never auto-retried |
| 7.5–7.6 | Inspector and debugger: trace tree, events, fee breakdown | Not started | Transaction view using `traceTransaction`, with call hierarchy, events decoded by the ABI, and execution resources |
| 8.1 | Wallets: Ready (Argent), Braavos | Exists | Add message signing (`wallet_signTypedData`) only if the wallet API supports it |
| 8.2–8.3 | Account inspection, deployment, AA workflows | Partially implemented | Exists: nonce, class and balance. Add account class detection and deploy-account preparation. |
| 8.3 | Multicall | Exists | Calldata preview missing |
| 8.4 | Paymaster | Not started | Only through SNIP-29 paymaster RPC if configured. Otherwise marked unavailable. |
| 9 | Event explorer | Not started | `getEvents` with filters and continuation tokens, ABI decoding, export |
| 10 | Network explorer: block, class, state update | Partially implemented | Fixed: the explorer now uses custom endpoints and failover (G1), and address lookups no longer fail on RPC error 29. Next: extend the explorer. |
| 11 | L1 to L2 messaging | Not started | `getMessagesStatus` by L1 hash. Linking to Ethereum needs an ETH RPC (EVM chain 1 already configured). |
| 12 | Real-time monitor | Not started | WebSocket client for spec 0.10 subscriptions, with reconnect and resubscribe, and reorg notifications shown |
| 13 | Webhooks for Starknet events | Partially implemented | Infrastructure exists. Needs a backend Starknet event monitor (like `stellar_indexer.rs`) and new event types. |
| 14 | Fee and resource analysis | Not started | From `estimateFee`, receipts and traces only |
| 15 | Testing and automation | Exists (shared) | Assertions, runner and `txio run` already exist. Add Starknet examples. |
| 16 | Local devnet | Partially implemented | localnet points to `127.0.0.1:5050/rpc`. Add devnet diagnostics. |
| 17 | State and proofs | Not started | `getStorageProof` view. Verification only if implemented and tested against vectors, otherwise labelled "unverified RPC data". |
| 18 | Benchmarking | Not started | Read-only methods only, with capped count and concurrency |
| 19–20 | Collections and environments | Exists (shared) | Variables such as `CONTRACT_ADDRESS` already work through `{{VAR}}` substitution |
| 21 | SDK | Not started | Add `starknet` to `Chain`. Chain client is a separate decision (see section 6). |
| 22 | CLI | Partially implemented | Exists: call, tx, block, simulate, balance, history and run. Add `class`, `events`, `storage`, `trace` and `estimate`. |
| 23 | Public API | Not started | Needs a backend design (see section 6) |
| 24 | Collaboration | Exists (shared) | No Starknet work |
| 25 | Docs and export | Partially implemented | Shared export exists. Add Starknet docs page entries. |
| 26 | Security | Partially implemented | Exists: SSRF guard, signed webhooks, wallet-only signing, no key storage. Add read-only retry gating. |
| 27 | UI | In progress | Starknet workspace exists (`topbar`) |
| 28 | Database | Not started | Only for monitors and webhooks (backend) |
| 29 | Tests | Partially implemented | Exists: `starknet.test.ts`, `starknetExplorer.test.ts`, a live test |

## 5. Proposed stages

Each stage ends with its own tests, a full regression run, a live check against Sepolia or mainnet read-only, and a report.

**Stage 2: RPC coverage and method registry (frontend).** Fixes G1, G2, G3 and part of 3.3.
- A registry of all 32 methods, plus `getCompiledCasm`, with read/write, retry safety, spec version, docs link and template.
- A test checks the registry against the v0.10.3 OpenRPC files: every spec method present, no invented methods.
- Templates use `pre_confirmed` and `latest`, never `pending`.
- Write methods (`add*Transaction`) show a warning and are never retried. Reads use the existing failover.
- The explorer uses the custom-RPC failover list.
- **Accept:** every read method returns a real result or a real RPC error on Sepolia. The registry test passes.

**Stage 3: Cairo Studio (frontend).** Fixes G5 and G6.
- ABI paste, upload or chain fetch; views of interfaces, functions, events, structs and enums.
- Typed argument forms, read calls with decoded return values, calldata preview.
- Tools: selector, felt/hex/decimal, u256 split and join, ByteArray encode and decode, short string.
- Everything through starknet.js. Nothing is hand-encoded.
- **Accept:** round-trip tests for every Cairo type in spec Part 5.2, and a live read call on a known mainnet contract (STRK `balanceOf`, `name`, `decimals`).

**Stage 4: Contract and explorer depth.** Fixes G7 and G15 (view only).
- Block, class, state update and storage views. Storage key derivation.
- Sierra and CASM import with a local class-hash comparison, labelled as a hash match, not source verification.

**Stage 5: Transaction studio.** Fixes G4.
- `estimateFee`, resource-bounds editor, payload preview, trace tree, fee breakdown, decoded events.

**Stage 6: Events and messaging.** Fixes G14.
- Event explorer with continuation tokens. `getMessagesStatus` view.

**Stage 7: Real-time.** Fixes G8.
- WebSocket subscriptions for new heads, events and transaction status, with reconnect and reorg handling.

**Stage 8: Backend monitors and webhooks.** Fixes G9.
- A Starknet event worker modelled on `stellar_indexer.rs`, new webhook event types, and tests.

**Stage 9: CLI, SDK and public API.** Fixes G13 and part of Part 22.

**Stage 10: Providers, benchmarks, proofs view, paymaster (where available), docs and final QA.**

## 6. Decisions (2026-11-27)

1. **RPC auth headers (G10):** per-endpoint headers are stored in this browser's settings only. They are never sent to the TXIO backend and never exported.
2. **Public API scope (Part 23):** read endpoints only, for data the backend already indexes. No general RPC relay.
3. **Paymaster (8.4):** SNIP-29 paymaster RPC only when the user configures a paymaster URL. No default provider. (Proposed; not yet confirmed.)
4. **Contracts page:** Cairo Studio replaces Starknet's "Contracts" slot, which brings back the declare and deploy flow.

## 7. Risks

- **starknet.js versions:** 10.8.0 is pinned, and its RPC version selection must match 0.10. The provider already works against 0.10.3 (explorer and simulation), but trace and storage-proof typings need checking per method.
- **Public endpoint limits:** PublicNode is free, keyless and rate limited. Benchmarks and monitors must cap traffic.
- **No historical traces:** a free full node may not keep historical traces. Treat a "not found" result as a provider limitation, not "the transaction does not exist".
- **Backend branch:** the backend is on `feat/stellar-contract-indexer`. Starknet backend work should start from where that branch lands.

## 8. Stage 2 results (2026-11-27)

Live run: `LIVE=1 npx vitest run src/services/starknetMethods.live.test.ts`, last passed 2026-11-27 on both networks. The test asserts the exact outcome of every method below. It uses real values from a recent block. A protocol error counts as a valid answer; method-not-found (-32601) or invalid-params (-32602) would mean the registry is wrong.

| Method | Sepolia | Mainnet |
|---|---|---|
| 5 general methods, 5 block methods, 4 transaction methods | ok | ok |
| `call`, `getStorageAt`, `getNonce`, `getClassHashAt`, `getClassAt`, `getClass`, `getEvents`, `getCompiledCasm` | ok | ok |
| `estimateFee` (unsigned, `SKIP_VALIDATE`, `pre_confirmed`) | ok, FRI estimate | ok |
| `simulateTransactions` (`pre_confirmed`) | ok | ok |
| `traceTransaction`, `traceBlockTransactions` | ok | ok |
| `getStorageProof` | ok (raw data, not verified) | ok |
| `estimateMessageFee` with a made-up L1 message | RPC error 40 (contract error): expected | RPC error 40 |
| `getMessagesStatus` with an unknown L1 hash | RPC error 29 (not found): expected | RPC error 29 |
| Write methods | not sent: they need a signed transaction | not sent |

Two findings from the run:

- **Pre-confirmed nonce (bug fixed):** the node checks the nonce against pre-confirmed state. It answers error 41, "Invalid transaction nonce ... Account nonce: N; got: N-k", when given the nonce from `latest`. TXIO's simulation read the nonce at `latest`, so simulating right after sending a transaction failed. `simulateStarknetCalls` now reads the nonce and simulates at `pre_confirmed` (`STARKNET_SIMULATION_BLOCK`), pinned by `starknetSimulation.test.ts`. The `estimateFee` and `simulateTransactions` templates use `pre_confirmed` too.
- **Bot accounts in the live test:** an account that sends several transactions per block moves its nonce between the nonce read and the estimate. The live test therefore borrows a sender with one transaction in the block.
- **Rate limiting:** under bursts, PublicNode mainnet sometimes answers with an HTML page. The engine now reports this as a provider failure and fails over, instead of `Unexpected token '<'`.

### How the spec fixture is made

`src/services/starknetSpec-0.10.3.json` lists each method's name, API and parameters (name, required) from the spec files at tag v0.10.3. Regenerate it like this:

```sh
for f in starknet_api_openrpc starknet_trace_api_openrpc starknet_write_api starknet_executables starknet_ws_api; do
  curl -sO https://raw.githubusercontent.com/starkware-libs/starknet-specs/v0.10.3/api/$f.json
done
python3 - <<'PY'
import json
files = {'read': 'starknet_api_openrpc', 'trace': 'starknet_trace_api_openrpc', 'write': 'starknet_write_api',
         'executables': 'starknet_executables', 'ws': 'starknet_ws_api'}
out = {'source': 'https://github.com/starkware-libs/starknet-specs/tree/v0.10.3/api', 'version': '0.10.3', 'methods': []}
for api, f in files.items():
    for m in json.load(open(f + '.json'))['methods']:
        out['methods'].append({'name': m['name'], 'api': api,
                               'params': [{'name': p['name'], 'required': p.get('required', False)} for p in m.get('params', [])]})
json.dump(out, open('starknetSpec-0.10.3.json', 'w'), indent=1)
PY
```

To move to a new spec version, regenerate the fixture at the new tag and bump `STARKNET_SPEC_VERSION`. `starknetMethods.test.ts` then lists every method that was added, removed or changed.
