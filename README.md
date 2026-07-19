# txio

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

<div align="center">
  <img src="assets/txio.png" alt="txio" width="100%">
  <br />
  <p align="center">
    <strong>One terminal. Every chain.</strong>
    <br />
    A unified CLI for Sui, Ethereum, Solana, Aptos, and Soroban.
  </p>
  <p align="center">
    <a href="https://crates.io/crates/txio"><img src="https://img.shields.io/crates/v/txio.svg?style=flat-square" alt="Crates.io"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="License"></a>
  </p>
</div>

---

## What is txio?

`txio` replaces five different chain CLIs with one elegant terminal experience. It brings Sui, Ethereum, Solana, Aptos, and Soroban together under shared commands, consistent flags, and a unified workflow.

- Unified commands across all supported chains
- Shared network flag semantics
- Name resolution for `.sui`, `.eth`, and more
- Built for CLI-first and full-stack development

---

## Why it matters

Developers should never need a separate terminal for every chain. Today’s multi-chain landscape is fragmented by:

- different install flows for each CLI
- inconsistent network flags and config formats
- chain-specific runtime conventions
- raw wallet addresses instead of readable names

`txio` removes that friction and turns multi-chain development into one refined experience.

---

## Key benefits

- **One interface, five chains** — same UX for Sui, Ethereum, Solana, Aptos, and Soroban
- **Instant network switching** — `--network testnet`, `mainnet`, or `devnet` works everywhere
- **Smart name resolution** — `.sui`, `.eth`, and other namespaces resolve automatically
- **Readable output** — clean terminal tables with raw JSON available via `--pretty`
- **Full-stack launch** — start API, dashboard, and database together with Docker Compose

---

## Highlights

- Unified chain commands and shared flags
- Namespace-first address resolution
- Dynamic network selection without config changes
- CLI auth workflows via `login`
- Polished terminal output with JSON fallback
- Docker Compose orchestration for backend, frontend, and datastore

---

## Repository structure

| Path | Purpose | Tech Stack |
| :--- | :--- | :--- |
| [`/cli`](./cli) | Terminal interface and chain adapters | Rust, Clap |
| [`/backend`](./backend) | API routing, caching, and chain aggregation | Rust, Axum |
| [`/frontend`](./frontend) | Web dashboard and docs | Next.js, React, Tailwind |
| [`/desktop`](./desktop) | Desktop wrapper *(In Development)* | Electron |

---

## Prerequisites

- Rust (stable toolchain)
- Node.js v20+
- Docker & Docker Compose

---

## Quick start

### 1. Clone the repo

```bash
git clone https://github.com/Txio-labs/txio.git
cd txio
npm install
```

### 2. Start the stack

```bash
cp .env.example backend/api/.env
# Update backend/api/.env with at minimum:
#   MONGO_INITDB_ROOT_USERNAME, MONGO_INITDB_ROOT_PASSWORD
#   JWT_SECRET (>=32 chars), BREVO_API_KEY, GROQ_API_KEYS
docker-compose up -d
```

### 3. Run the CLI

```bash
cd cli
cargo run -- login
cargo run -- sui balance aliphatic.sui
cargo run -- --network testnet eth balance 0x...
```

> Run `txio --help` to explore the full command surface.

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

[implement GitHub OAuth account linking (stubbed in two places)](https://contribute.grantfox.xyz/campaigns/org/Txio-labs/repo/txio/issue/153)
