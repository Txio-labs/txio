# txio

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

<div align="center">
  <img src="assets/txio.png" alt="txio" width="100%">
  <br />
  <p align="center">
    <strong>One terminal. Every chain.</strong>
    <br />
    A unified terminal experience for Sui, Ethereum, Solana, Aptos, and Soroban.
  </p>
  <p align="center">
    <a href="https://crates.io/crates/txio"><img src="https://img.shields.io/crates/v/txio.svg?style=flat-square" alt="Crates.io"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="License"></a>
  </p>
</div>

---

## What is txio?

`txio` combines five chain CLIs into one consistent developer interface.
It wraps Sui, Ethereum, Solana, Aptos, and Soroban behind shared commands,
flags, and conventions so you can stay in one terminal and switch networks fast.

- Unified commands across chains
- Shared flags and network switching
- Human-readable names and output
- Built for CLI-first and full-stack workflows

---

## Why it matters

Multi-chain development should not feel like five different products.
The current ecosystem is fragmented with:

- Separate install flows for each chain CLI
- Different flags for network selection
- Chain-specific config files and runtime conventions
- Raw addresses instead of readable names

`txio` makes multi-chain work feel like one polished workflow.

---

## Key benefits

- **One interface, five chains** — identical UX for Sui, Ethereum, Solana, Aptos, and Soroban
- **Instant network switching** — `--network testnet`, `mainnet`, or `devnet` works everywhere
- **Name resolution built in** — `.sui`, `.eth`, and other namespaces resolve automatically
- **Readable by default** — clean tables in the terminal with raw JSON via `--pretty`
- **Full-stack launch** — `docker-compose up` starts API, dashboard, and database together

---

## Features

- Unified chain commands and shared flags
- Automatic namespace-based address resolution
- Dynamic network selection with zero config changes
- CLI authentication via `login`
- Smart CLI formatting plus JSON fallback
- Docker Compose orchestration for backend, frontend, and datastore

---

## Repository structure

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

## Quick start

```bash
git clone https://github.com/Txio-labs/txio.git
cd txio
npm install
```

```bash
cp .env.example backend/api/.env
# Update backend/api/.env with at minimum:
#   MONGO_INITDB_ROOT_USERNAME, MONGO_INITDB_ROOT_PASSWORD
#   JWT_SECRET (>=32 chars), BREVO_API_KEY, GROQ_API_KEYS
docker-compose up -d
```

```bash
cd cli
cargo run -- login
cargo run -- sui balance aliphatic.sui
cargo run -- --network testnet eth balance 0x...
```

---

## Contributing

Adding a new chain is intentionally simple:

1. Implement the `ChainAdapter` trait.
2. Add a file under `cli/src/chains/`.
3. Register it in the adapter factory.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

---

## License

MIT — see [LICENSE](./LICENSE).
