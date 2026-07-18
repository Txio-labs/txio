# txio
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)


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

Every chain ships its own CLI, and none of them agree on anything. `sui client`, `solana`, `aptos`, `soroban`, plus whatever you've bolted together for Ethereum — each with its own install step, its own flag names, its own config file, and its own idea of what a "network" argument should look like. Switch from Sui devnet to Ethereum mainnet mid-session and you're not passing a different flag, you're opening a different terminal.

And none of them speak human. Checking a balance means resolving `.sui` or `.eth` yourself, then pasting the raw address back in. Do that across five ecosystems, and a two-second task — "what's in this wallet?" — turns into a scavenger hunt.

---

## The Solution

**txio** puts Sui, Ethereum, Solana, Aptos, and Soroban behind one interface. Learn it once, use it everywhere.

*   **One interface, five chains** – Sui, Ethereum, Solana, Aptos, and Soroban all use the same commands and flags.
*   **Instant network switching** – Pass `--network testnet` (or `mainnet`, `devnet`) to any command. No config file to edit.
*   **Names just work** – `.sui`, `.eth`, and friends resolve automatically before the request goes out. You never touch a raw address.
*   **Readable by default** – Clean, formatted tables in your terminal. Need raw data? Add `--pretty` for JSON.
*   **One command, full stack** – `docker-compose up` boots the API, dashboard, and database together.

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

You'll need:
*   **Rust** (stable toolchain)
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
cp .env.example backend/api/.env
# Edit backend/api/.env and set at minimum:
#   MONGO_INITDB_ROOT_USERNAME, MONGO_INITDB_ROOT_PASSWORD
#   JWT_SECRET (>=32 chars), BREVO_API_KEY, GROQ_API_KEYS
docker-compose up -d
```

The full stack runs MongoDB with `--auth` enabled and credentials from
`backend/api/.env`. Both `mongod` (read as MONGO_INITDB_ROOT_USERNAME /
MONGO_INITDB_ROOT_PASSWORD) and the API (read as MONGO_URI) load the same
file, so the username and password only need to be set in one place.

The frontend comes up on its default port, with the API running behind it.

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

Adding a new chain is deliberately simple: implement the `ChainAdapter` trait, drop a single file under `cli/src/chains/`, and register it in the factory. That's it. Full details live in [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## License

MIT — see [LICENSE](./LICENSE).
