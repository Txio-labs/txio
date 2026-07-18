# txio

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

<div align="center">
  <img src="assets/txio.png" alt="txio" width="100%">
  <br />
  <p align="center">
    <strong>One terminal. Every chain.</strong>
    <br />
    A unified terminal interface for Sui, Ethereum, Solana, Aptos, and Soroban.
  </p>
  <p align="center">
    <a href="https://crates.io/crates/txio"><img src="https://img.shields.io/crates/v/txio.svg?style=flat-square" alt="Crates.io"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="License"></a>
  </p>
</div>

---

## What is txio?

`txio` replaces five separate chain CLIs with one clean, consistent tool.
It wraps Sui, Ethereum, Solana, Aptos, and Soroban behind a single command set so
developers can move between ecosystems without learning a new CLI for each one.

- Unified commands across chains
- Shared flags and network switching
- Human-readable names and output
- Built for CLI-first and full-stack development

---

## Why it matters

Most chain tooling is fragmented:

- Separate install flows for each chain CLI
- Different flags for network selection
- Chain-specific config files and runtime conventions
- Raw addresses instead of readable names

`txio` makes multi-chain work feel like one product instead of five.

---

## Key Benefits

- **One interface, five chains** — identical UX for Sui, Ethereum, Solana, Aptos, and Soroban.
- **Instant network switching** — `--network testnet`, `mainnet`, or `devnet` works everywhere.
- **Name resolution built in** — `.sui`, `.eth`, and other namespaces resolve before request execution.
- **Readable by default** — terminal-friendly output with optional raw JSON via `--pretty`.
- **Full-stack launch** — `docker-compose up` starts the API, dashboard, and database together.

---

## Features

- Unified chain commands and shared flags
- Automatic namespace-based address resolution
- Dynamic network selection with no config file edits
- Authenticated CLI workflows through `login`
- Clean CLI tables and JSON fallback with `--pretty`
- Backend + frontend + database orchestration via Docker Compose

---

## Repository Structure

| Path                      | Purpose                                     | Tech Stack               |
| :------------------------ | :------------------------------------------ | :----------------------- |
| [`/cli`](./cli)           | Terminal interface and chain adapters       | Rust, Clap               |
| [`/backend`](./backend)   | API routing, caching, and chain aggregation | Rust, Axum               |
| [`/frontend`](./frontend) | Web dashboard and docs                      | Next.js, React, Tailwind |
| [`/desktop`](./desktop)   | Desktop wrapper _(In Development)_          | Electron                 |

---

## Prerequisites

- Rust (stable toolchain)
- Node.js v20+
- Docker & Docker Compose

---

## Getting Started

### Clone and install

```bash
git clone https://github.com/Txio-labs/txio.git
cd txio
npm install
```

### Start the full stack

```bash
cp .env.example backend/api/.env
# Update backend/api/.env with at minimum:
#   MONGO_INITDB_ROOT_USERNAME, MONGO_INITDB_ROOT_PASSWORD
#   JWT_SECRET (>=32 chars), BREVO_API_KEY, GROQ_API_KEYS
docker-compose up -d
```

This brings up MongoDB with auth enabled, the backend API, and the frontend dashboard.

### Run the CLI

```bash
cd cli

# Authenticate your terminal:
cargo run -- login

# Resolve .sui names automatically:
cargo run -- sui balance aliphatic.sui

# Query another chain and network in one command:
cargo run -- --network testnet eth balance 0x...
```

Run `txio --help` to explore commands and flags.

---

## Contributing

Adding a new chain is intentionally simple:

1. Implement the `ChainAdapter` trait.
2. Add a file under `cli/src/chains/`.
3. Register it in the adapter factory.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full workflow.

---

## License

MIT — see [LICENSE](./LICENSE).
