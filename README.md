# txio

<div align="center">
  <img src="assets/txio.png" alt="txio" width="100%">
  <br />
  <p align="center">
    <strong>One terminal. Every chain.</strong>
    <br />
    A unified, multi-chain developer toolkit for Sui, Ethereum, Solana, Aptos, and Soroban.
  </p>
  <p align="center">
    <a href="https://crates.io/crates/txio"><img src="https://img.shields.io/crates/v/txio.svg?style=flat-square" alt="Crates.io"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="License"></a>
  </p>
</div>

---

## The Problem

Building or operating across more than one chain means living with a different CLI for each of them. `sui client`, `solana`, `aptos`, `soroban`, plus whatever you've cobbled together for Ethereum — each with its own install step, its own flag names, its own config file, and its own idea of what a "network" argument looks like. Switching from Sui devnet to Ethereum mainnet mid-session means switching tools entirely, not just an argument.

On top of that, none of them speak human-readable names. Checking a balance means resolving `.sui` or `.eth` yourself first, then pasting the raw address back in. Multiply that friction across five ecosystems and a routine task — "what's in this wallet?" — turns into a scavenger hunt through five different toolchains.

---

## The Solution

**txio** is a unified CLI and web dashboard that puts Sui, Ethereum, Solana, Aptos, and Soroban behind one consistent interface.

*   **Unified Interface Across 5 Chains** – Sui, Ethereum, Solana, Aptos, and Soroban share the exact same command structure and flags.
*   **Instant Network Switching** – Pass `--network testnet` (or `mainnet`, `devnet`) directly to any command with zero configuration changes.
*   **Native Name Resolution** – `.sui`, `.eth`, and equivalent name services resolve automatically before requests are dispatched — no raw addresses to paste in by hand.
*   **Human-Readable Terminal Output** – Clean, formatted tables by default. Want raw data? Just append the `--pretty` flag for JSON.
*   **One-Command Local Stack** – Spin up the caching API, frontend dashboard, and database instantly via Docker.

---

## Repository Structure

| Path | Description | Tech Stack |
| :--- | :--- | :--- |
| [`/cli`](./cli) | Primary terminal interface | Rust, Clap |
| [`/backend`](./backend) | Caching API and intelligent request routing | Rust, Axum |
| [`/frontend`](./frontend) | Interactive web dashboard | Next.js, React, Tailwind |
| [`/desktop`](./desktop) | Desktop wrapper *(In Development)* | Electron |

---

## Prerequisites

Ensure you have the following installed locally:
*   **Rust** (Stable toolchain)
*   **Node.js** (v20+)
*   **Docker** & **Docker Compose**

---

## Getting Started

### 1. Clone and Install

```bash
git clone https://github.com/Txio-labs/txio.git
cd txio
npm install
```

### Start the full stack

Boots the backend, frontend, and database in one command:

```bash
docker-compose up -d
```

The frontend is available on its default port; the API runs behind it.

### Run the CLI

```bash
cd cli

# Authenticate your terminal
cargo run -- login                           

# Resolve .sui names automatically
cargo run -- sui balance aliphatic.sui       

# Query different networks on the fly
cargo run -- --network testnet eth balance 0x...
```

Run `txio --help` to see all available commands and flags.

---

## Contributing

We welcome contributions! Adding a new chain integration is highly modular:

Implement the `ChainAdapter` trait.

Add a single file under `cli/src/chains/`.

Register it in the factory.

For comprehensive architectural details, please read CONTRIBUTING.md.

---

## License

MIT — see [LICENSE](./LICENSE).
