# txio Frontend

The web app. An API client and visual transaction builder for Sui — Postman's familiar shape, with Web3 wired in. Move calls, PTBs, name resolution, all of it.

---

## 1. Layout & navigation

### Header
- **Sidebar toggle** — collapse or expand the left nav.
- **Network switcher** (top right) — flip between Mainnet, Testnet, and Devnet. Runs a handshake (Syncing → Handshake → Registry Update) and shows health as a colored dot based on simulated RPC latency.
- **Active wallet** — current keypair alias, right there in the chrome.
- **User profile** — settings, API keys, log out.

### Tabs

Works like an IDE.

- Open as many Request Builders, PTB Builders, or tool pages as you want — side by side.
- The three-dot menu at the end of the tab bar gives you:
  - **Save active tab** — persists the current state.
  - **Clear all open tabs** — closes everything in one shot.
  - **Saved tabs** — restore your saved work.
  - **Recently closed** — undo for tabs.

---

## 2. Sidebar modules

### Collections
Tree view of requests, grouped into collections and folders.

- Hit the **+** to create a new collection.
- Expand/collapse nodes as you'd expect.
- **Run collection** kicks off every request in order — see the Collection Runner.
- Shared collections get a visual marker.

### History
Auto-grouped by time: Recent, Today, Yesterday, Older.

- **Search** by name or method.
- **Filter** by type — All, RPC, Transaction (PTB), Error.
- Color-coded status dots: green for 200 OK, red for failures.
- Click an entry to replay it in a new tab.

### Environments
Key-value pairs you can reach from any input field via `{{VARIABLE_NAME}}`.

- Define things like `PACKAGE_ID` or `ADMIN_CAP` once, use them everywhere.
- Hide sensitive values when needed.

---

## 3. Request builders

### New request

A selection hub when you open a fresh tab. Pick JSON-RPC or Transaction Builder.

### JSON-RPC builder
- Autocomplete for common Sui RPC methods.
- JSON array params, validated.
- "Execute" runs the call and updates History and the Activity Log.

### Transaction builder (Move calls)
- **Package / Module / Function** — all support `{{variable}}` interpolation.
- **Type arguments** — comma-separated.
- **Arguments** — JSON array.
- **Gas budget** — in MIST.
- **Simulate** runs a dry-run before you commit.

### Code snippet generator
Translates whatever you build in the GUI into a CLI command in real time.

- Generates `curl` for RPC calls and `sui client call` for transactions.
- Resolves `{{ENV_VARS}}` to their real values in the output.

---

## 4. Response panel

Whatever the last call returned.

- Toggle between pretty-printed JSON and raw text.
- **Metadata** tab — gas breakdown, finality, transaction digest.
- **Events** tab — parsed events, separated out.

---

## 5. Visual PTB builder

A node-based editor for Programmable Transaction Blocks. Infinite canvas, dot grid, panning.

Nodes:
- **Object** — input coins or objects.
- **SplitCoins** — visualize the split logic.
- **Transfer** — send assets to an address.

Drag to rearrange. Connect to wire up the flow.

---

## 6. Collection runner

Run every request in a collection, in order.

- Live progress bar and status as it runs.
- Pass/fail per request, with timing.
- Start, pause, reset.

---

## 7. Inspector (right sidebar)

A floating utility panel over the workspace.

### Wallet
- Active signer with balance, address, alias.
- Copy address, view on explorer, refresh balance.
- Manage imported keypairs.

### Objects
- Scan owned objects for the active wallet.
- Click any object to see its raw JSON.

### Activity & discuss
- Audit log of every action you took.
- Team chat threaded to specific tabs.

---

## 8. AI Console

Powered by Google Gemini (`gemini-3-pro-preview`).

Ask in plain English. The AI can also create tabs for you via function calls:
- `create_rpc_request` — opens an RPC tab with method and params pre-filled.
- `create_ptb` — opens a Transaction Builder.

---

## 9. Recipes

Templates for common transactions — mint an NFT, split coins, stake SUI. One click to load.

---

## 10. Dashboard

What you see when no tabs are open.

- RPC health — live latency charts per endpoint.
- Quick actions — shortcuts to new requests or recipes.
- Recent activity — your latest local runs.

---

## License

MIT. See [LICENSE](LICENSE).
