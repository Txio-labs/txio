# txio

**One terminal. Every chain.**

txio is a CLI for developers who'd rather not install six different blockchain tools. One binary covers Sui, Ethereum, Solana, Aptos, and Soroban — same flags, same commands, predictable output.

## What it does

- **Five chains, one CLI.** Sui, Ethereum, Solana, Aptos, Soroban.
- **Network switching that gets out of the way.** `--network testnet` and move on.
- **Names, not hex.** `aliphatic.sui` resolves before the request fires.
- **Did-you-mean built in.** Typo'd `ethreum`? It'll suggest `ethereum`.
- **Readable output by default.** `--pretty` if you want raw JSON.

---

## Install

Pick whichever fits your setup.

**Cargo (Rust):**
```bash
cargo install txio-cli   # installs the `txio` binary
```
For local dev: `cargo install --path .` from the repo root.

**Homebrew (macOS/Linux):**
```bash
brew tap txio-cli/txio
brew install txio
```

**npm (Node.js):**
```bash
npm install -g @txio-cli/txio
```

**Shell script:**
```bash
curl -fsSL https://txio-cli.dev/install.sh | bash
```

Then `txio` is on your PATH.

---

## Quick start

### 1. Log in

```bash
txio login
```

Stores a JWT in `~/.txio/token` so requests get logged to your account.

### 2. Check balances

```bash
# Sui (mainnet by default)
txio sui balance 0x10735ec3c80f136c482c694d5cba775ee1ac7f971686fcd3d47f3f0175e5ff8b

# Solana (devnet)
txio --network devnet solana balance <address>

# Ethereum (testnet)
txio --network testnet eth balance <address>
```

Decimals and hex conversions are handled for you.

### 3. Switch networks

Mainnet is the default. Override with `--network` (or `-n`):

```bash
txio --network testnet sui balance 0x123...
txio --network localnet solana call --method getHealth
```

Supported: `mainnet`, `testnet`, `devnet`, `localnet`.

### 4. Use names

Where chains support it, pass names instead of addresses:

```bash
txio sui balance aliphatic.sui
```

txio resolves to the hex address before the call goes out.

### 5. Custom RPC

Skip the default public nodes with `--rpc-url`:

```bash
txio --rpc-url https://my.custom.node sui balance <address>
```

### 6. Raw JSON-RPC

```bash
txio sui call --method suix_getChainIdentifier
txio solana call --method getAccountInfo --params '["<address>"]'
```

If you're logged in, the call is logged under your account.

---

## Adding a chain

txio uses a `ChainAdapter` trait. Every chain lives in `src/chains/`.

1. Drop a new file at `src/chains/mychain.rs`.
2. Implement `ChainAdapter` — at minimum, `call_rpc` and `get_balance`.
3. Register it in `ChainFactory` (`src/chains/factory.rs`).

That's the whole flow.

---

## Help & auth commands

```bash
txio --help         # everything
txio login          # interactive login, stores JWT in ~/.txio/token
txio profile        # view, update email, change password
txio db list-users  # admin only
```
