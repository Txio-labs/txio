# Flow 🌊

**The Universal Multi-Chain Blockchain Terminal**

Flow is a production-grade, modular CLI tool designed to provide a unified developer experience across multiple blockchains. Instead of installing a dozen different CLIs, `flow` acts as a pluggable terminal interface for Sui, Ethereum, Solana, Aptos, and Soroban. 

## Features
- **Multi-Chain Support**: Currently supports Sui, Ethereum, Solana, Aptos, and Soroban (Stellar).
- **Smart Network Switching**: Effortlessly toggle between `mainnet`, `testnet`, `devnet`, and `localnet`.
- **Typo Correction**: Built-in fuzzy-matching (Did you mean `ethereum` instead of `ethreum`?).
- **Intelligent Formatting**: Beautiful, premium terminal output with raw JSON fallbacks (`--pretty`).
- **Domain Name Resolution**: Automatically resolves human-readable names like `.sui` directly in your requests.

---

## 🛠 Installation

To install `flow` globally on your system, you can pull it directly from the terminal without having to download the source files manually (just like Git or Claude Code).

**Via Cargo (Rust)**
If you have Cargo installed, simply run:
```bash
cargo install flow-cli   # publishes the `flow` binary
```
*(For local development you can also run `cargo install --path .` from the repository root.)*

**Via Homebrew (macOS/Linux)**
```bash
brew tap flow-cli/flow
brew install flow
```

**Via NPM (Node.js)**
```bash
npm install -g @flow-cli/flow
```

**Via Quick Bash Script**
```bash
curl -fsSL https://flow-cli.dev/install.sh | bash
```

Once installed, you can run the `flow` command from anywhere in your terminal!

---

## 🚀 Quick Start

### 1. Authenticate
Before using any chain‑specific commands you should log in to your Flow account. This stores a JWT locally and enables request logging.

```bash
flow login
```

### 2. Check Balances
Once logged in, you can format and read balances for any address. `flow` automatically handles decimals and hex‑conversions for the specific chain.

```bash
# Sui (Mainnet)
flow sui balance 0x10735ec3c80f136c482c694d5cba775ee1ac7f971686fcd3d47f3f0175e5ff8b

# Solana (Devnet)
flow --network devnet solana balance <address>

# Ethereum (Testnet)
flow --network testnet eth balance <address>
```

### 3. Network Switching
By default, commands run on `mainnet`. You can override this globally with the `--network` (or `-n`) flag.

```bash
flow --network testnet sui balance 0x123...
flow --network localnet solana call --method getHealth
```
*Supported networks: `mainnet`, `testnet`, `devnet`, `localnet`.*

### 4. Name Resolution
For supported chains, you can directly pass domain names instead of hex addresses. 

```bash
flow sui balance aliphatic.sui
```
*Flow will automatically resolve `aliphatic.sui` to its hex address before executing the command.*

### 5. Custom RPC URLs
If you want to bypass the default public nodes, pass your own RPC endpoint using the `--rpc-url` flag:

```bash
flow --rpc-url https://my.custom.node sui balance <address>
```

### 6. Make Direct RPC Calls
You can easily make generic JSON‑RPC calls to any integrated chain. Authenticated requests will be logged under your account.

```bash
flow sui call --method suix_getChainIdentifier
```

Pass parameters as a JSON array string:
```bash
flow solana call --method getAccountInfo --params '["<address>"]'
```

---

## 🧩 Architecture (For Developers)
Flow uses a dynamic `ChainAdapter` pattern. Every blockchain is implemented as a pluggable module inside the `src/chains/` directory.

To add a new chain:
1. Create a new file `src/chains/mychain.rs`.
2. Implement the `ChainAdapter` trait (which requires methods like `call_rpc` and `get_balance`).
3. Register your chain in the `ChainFactory` inside `src/chains/factory.rs`.

---

## 💡 Get Help
To see all available global flags and subcommands, just run:

```bash
flow --help
```

## 🔐 Authentication Commands
- `flow login` – Interactive login, stores a JWT in `~/.flow/token`.
- `flow profile` – Manage your user profile (view, update email, change password).
- `flow db list-users` – Admin command to list all registered users (requires admin email flag).
