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

## Overview

**txio** is a unified CLI and web dashboard designed to streamline interactions across multiple blockchains—including Sui, Ethereum, Solana, Aptos, and Soroban—through a single, consistent interface.

Stop juggling multiple CLIs, dozens of RPC endpoints, and varying address formats. **txio** normalizes commands and flags across chains, natively resolves human-readable names (`.sui`, `.eth`), and surfaces data beautifully through either your terminal or a local web dashboard.

---

## Key Features

*   **Unified Interface Across 5 Chains** – Sui, Ethereum, Solana, Aptos, and Soroban share the exact same command structure and flags.
*   **Instant Network Switching** – Pass `--network testnet` (or `mainnet`, `devnet`) directly to any command with zero configuration changes.
*   **Native Name Resolution** – Handlers like `.sui` and `.eth` resolve automatically behind the scenes before requests are dispatched.
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
git clone [https://github.com/Kingvic300/txio.git](https://github.com/Kingvic300/txio.git)
cd txio
npm install

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

## Features

- **Unified interface across five chains** — Sui, Ethereum, Solana, Aptos, and Soroban share the same command structure and flags.
- **Network switching** — Pass `--network testnet` (or `mainnet`, `devnet`) to any command. No config changes required.
- **Name resolution** — `.sui`, `.eth`, and equivalent name services are resolved automatically before requests are sent.
- **Readable output by default** — Responses are formatted for the terminal. Use `--pretty` to get raw JSON.
- **One-command stack** — `docker-compose up` starts everything: API, frontend, and database.

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
