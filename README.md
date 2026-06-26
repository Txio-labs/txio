# txio

<div align="center">
  <img src="assets/txio.png" alt="txio" width="100%">
  <br />
  <p align="center">
    <strong>One terminal. Every chain.</strong>
    <br />
    A multi-chain developer toolkit for Sui, Ethereum, Solana, Aptos, and Soroban.
  </p>
  <p align="center">
    <a href="https://crates.io/crates/txio"><img src="https://img.shields.io/crates/v/txio.svg?style=flat-square" alt="Crates.io"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="License"></a>
  </p>
</div>

---

## Overview

**txio** is a unified CLI and web dashboard for interacting with multiple blockchains — Sui, Ethereum, Solana, Aptos, and Soroban — through a single, consistent interface.

No more juggling four CLIs, six RPC endpoints, and three address formats. txio normalizes commands and flags across chains, resolves human-readable names (`.sui`, `.eth`), and surfaces everything through formatted terminal output or a web dashboard.

---

## Repository Structure

| Path | Description | Stack |
| :--- | :--- | :--- |
| [`/cli`](./cli) | Primary terminal interface | Rust, Clap |
| [`/backend`](./backend) | Caching API and request routing | Rust, Axum |
| [`/frontend`](./frontend) | Web dashboard | Next.js, React, Tailwind |
| [`/desktop`](./desktop) | Desktop wrapper *(in development)* | Electron |

---

## Prerequisites

- **Rust** (stable toolchain)
- **Node.js** 20+
- **Docker** (for the full stack)

---

## Getting Started

### Clone and install

```bash
git clone https://github.com/Kingvic300/Flow.git
cd Flow
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
cargo run -- login                           # Authenticate once
cargo run -- sui balance aliphatic.sui       # Resolve .sui names automatically
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

New chain integrations follow a straightforward pattern: implement the `ChainAdapter` trait, add a single file under `cli/src/chains/`, and register it in the factory. Full details are in [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## License

MIT — see [LICENSE](./LICENSE).
