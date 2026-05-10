
# Flow

Flow is a professional-grade API client and visual transaction builder tailored specifically for the Sui blockchain. It combines the familiarity of Web2 API tools (like Postman) with Web3-specific features for Move smart contract development.

## 1. Core Navigation & Layout

### Header
- **Sidebar Toggle**: Collapses/expands the left navigation sidebar.
- **Network Switcher**: Located in the top right. Allows switching between `Mainnet`, `Testnet`, and `Devnet`. It simulates a connection handshake (Syncing -> Handshake -> Registry Update) and displays real-time health status (Green/Orange/Red) based on simulated RPC latency.
- **Active Wallet**: Displays the currently active keypair alias.
- **User Profile**: Access to account settings, API keys, and logout functionality.

### Tabs System
The application uses a robust tab system similar to modern IDEs.
- **Dynamic Tabs**: Open multiple Request Builders, PTB Builders, or Tool pages simultaneously.
- **Tab Management**: 
  - **Context Menu (Three Dots)**: Located at the end of the tab bar.
  - **Save Active Tab**: Persists the current tab state.
  - **Clear All Open Tabs**: Closes all active workspaces.
  - **Saved Tabs**: Quick access to restore previously saved work.
  - **Recently Closed**: Restore accidentally closed tabs.

## 2. Sidebar Modules

The sidebar offers distinct modes for organizing your workflow:

### 📁 Collections
- **Tree View**: Organizes requests into Collections and Folders.
- **Management**: 
  - Create new collections via the "Plus" button.
  - Expand/Collapse nodes.
  - **Run Collection**: Execute all requests in a collection sequentially (see Collection Runner).
- **Shared Collections**: Visual indicator for team-shared resources.

### 🕒 History
- **Time-Grouped Log**: Automatically groups executed requests into "Recent", "Today", "Yesterday", and "Older".
- **Filtering**:
  - **Text Search**: Filter by request name or method.
  - **Type Filter**: Toggle between `ALL`, `RPC`, `TRANSACTION` (PTB), and `ERROR`.
- **Status Indicators**: Color-coded dots (Green for 200 OK, Red for Errors).
- **Replay**: Clicking a history item opens it in a new tab for replay/modification.

### 📦 Environments (Variables)
- **Global Variables**: Define key-value pairs (e.g., `PACKAGE_ID`, `ADMIN_CAP`) reusable across the app.
- **Syntax**: Access variables in any input field using double curly braces: `{{VARIABLE_NAME}}`.
- **Security**: Toggle visibility of sensitive values.

## 3. Request Builders

### New Request Page
- **Selection Hub**: Choose between JSON-RPC and Transaction Builder when opening a new tab.

### JSON-RPC Builder
- **Method Selection**: Autocomplete dropdown for common Sui RPC methods.
- **Parameters**: JSON array input with validation.
- **Execution**: Simulates a network call, updating the History and Activity Log.

### Transaction Builder (Move Calls)
- **Configuration Form**:
  - **Package/Module/Function**: Fields support variable interpolation.
  - **Type Arguments**: Comma-separated list.
  - **Arguments**: JSON array for function arguments.
  - **Gas Budget**: Configurable MIST amount.
- **Simulation**: "Simulate" button performs a dry-run.

### Code Snippet Generator
- **Real-time Translation**: Automatically converts the visual configuration in the Builder tab into a CLI command.
- **Formats**: Generates `curl` commands for RPC requests and `sui client call` commands for Transactions.
- **Variable Resolution**: Automatically resolves `{{ENV_VARS}}` to their actual values.

## 4. Response Panel
Displays the result of the last execution.
- **Views**: Toggle between Pretty Print (syntax highlighted JSON) and Raw text.
- **Metadata Tab**: Shows Gas Breakdown, Finality status, and Transaction Digest.
- **Events Tab**: Dedicated view for parsed events.

## 5. Visual PTB Builder
A node-based editor for Programmable Transaction Blocks.
- **Canvas**: Infinite pannable canvas with dot grid.
- **Nodes**:
  - **Object Node**: Represents input coins or objects.
  - **SplitCoins Node**: Visualizes splitting input logic.
  - **Transfer Node**: Represents sending assets to an address.
- **Interaction**: Drag nodes to rearrange the flow.

## 6. Collection Runner
Execute a sequence of requests automatically.
- **Batch Execution**: Run all requests in a collection in order.
- **Progress Tracking**: real-time progress bar and status completion.
- **Status Reporting**: Visual pass/fail indicators and timing metrics for each request.
- **Control**: Start, Pause, and Reset execution.

## 7. Inspector Panel (Right Sidebar)
A multi-functional utility panel that overlays the workspace.

### 👛 Wallet
- **Active Signer**: Shows current balance, address, and alias.
- **Actions**: Copy Address, View on Explorer, Refresh Balance.
- **Keypair Store**: Manage imported local keypairs.

### 🧊 Objects (Registry)
- **Object Scanner**: Fetches owned objects for the active wallet.
- **Inspector**: Clicking an object reveals its raw JSON structure.

### 📝 Activity & Discuss
- **Audit Log**: Chronological feed of user actions.
- **Team Chat**: Context-aware comments linked to specific request tabs.

## 8. AI Console
- **Integration**: Powered by Google Gemini (`gemini-3-pro-preview`).
- **Natural Language Control**: Chat with the AI to ask questions about Sui.
- **Function Calling**: The AI can programmatically create new tabs:
  - `create_rpc_request`: Opens a new RPC tab with method and params pre-filled.
  - `create_ptb`: Opens a new Transaction Builder.

## 9. Recipes
- **Library**: Access common transaction templates (e.g. Mint NFT, Split Coins, Stake SUI).
- **One-Click Load**: Quickly instantiate complex transaction patterns.

## 10. Dashboard
The default landing page when no tabs are open.
- **RPC Health**: Real-time latency charts for RPC endpoints.
- **Quick Actions**: Shortcuts to create requests or load recipes.
- **Recent Activity**: Summary of the latest local executions.

## License

This project is open-source and licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.
