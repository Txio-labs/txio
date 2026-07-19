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

Multi-chain development should feel seamless, not scattered.
Today’s ecosystem is broken by:

- Separate install flows for every chain CLI
- Different flags for network selection
- Chain-specific config files and runtime conventions
- Raw wallet addresses instead of readable names

`txio` turns that fragmentation into one polished workflow.

---

## What you get

- **One interface, five chains** — consistent UX for Sui, Ethereum, Solana, Aptos, and Soroban
- **Instant network switching** — `--network testnet`, `mainnet`, or `devnet` works everywhere
- **Smart name resolution** — `.sui`, `.eth`, and other namespaces resolve automatically
- **Readable outputs** — clean terminal tables with raw JSON via `--pretty`
- **Full-stack setup** — start API, dashboard, and database together with Docker Compose

---

## Highlights

- Unified chain commands and shared flags
- Namespace-first address resolution
- Zero-config network selection
- CLI auth via `login`
- Polished terminal output with JSON fallback
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

### 1. Clone the repo

```bash
git clone https://github.com/Txio-labs/txio.git
cd txio
npm install
```

### 2. Boot the full stack

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

> `txio --help` shows the full command surface.

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
