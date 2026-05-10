# txio 🚀

<div align="center">
  <img src="assets/banner.png" alt="txio Banner" width="100%">
  <br />
  <p align="center">
    <strong>The Universal Multi-Chain Blockchain Gateway</strong>
    <br />
    A production-grade, modular suite for developers across Sui, Ethereum, Solana, Aptos, and Soroban.
  </p>
  <p align="center">

    <a href="https://crates.io/crates/txio"><img src="https://img.shields.io/crates/v/txio.svg?style=flat-square" alt="Crates.io"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="License"></a>
  </p>
</div>

---

## 📖 Overview

**txio** is a unified developer platform designed to eliminate the friction of multi-chain development. Instead of juggling separate tools and environments for every blockchain, txio provides a single, high-performance interface that abstracts the complexities of different RPCs, address formats, and network types.

### Key Pillars
- **[txio CLI](./cli)**: A modular Rust-based terminal for querying, interacting, and managing multi-chain accounts.
- **[txio Frontend](./frontend)**: A premium Vite-powered dashboard for visual blockchain exploration.
- **[txio Backend](./backend)**: A high-performance Axum-based API that powers the ecosystem.

---

## 📂 Monorepo Structure

This project is organized as a modular monorepo for maximum scalability and code sharing.

| Directory | Component | Tech Stack | Description |
| :--- | :--- | :--- | :--- |
| [`/cli`](./cli) | **CLI Tool** | Rust, Clap | The core "Universal Terminal" interface. |
| [`/frontend`](./frontend) | **Web App** | React, Vite, CSS3 | A sleek, infrastructure-focused dashboard. |
| [`/backend`](./backend) | **API Service** | Rust, Axum | Centralized logic and caching for chain data. |
| [`/desktop`](./desktop) | **Desktop** | Electron | Cross-platform desktop client (In Dev). |

---

## 🚀 Quick Start

### Prerequisites
- **Rust (stable)**: For the CLI and Backend.
- **Node.js (v20+)**: For the Frontend and Desktop apps.
- **Docker**: For running the full stack locally.

### 1. Installation
Clone the repository and install all dependencies:

```bash
git clone https://github.com/Kingvic300/Flow.git
cd Flow
npm install
```

### 2. Local Development
The easiest way to get the entire ecosystem running is via Docker Compose:

```bash
docker-compose up -d
```

This will spin up:
- The Backend API (`txio-api`)
- The Frontend Dashboard
- Supporting database services

### 3. Using the CLI
To test the CLI locally from source:

```bash
cd cli
# Login to your account
cargo run -- login

# Execute commands (automatically logged if logged in)
cargo run -- sui balance aliphatic.sui
```

---

## 🛠 Features

- **Universal Chain Support**: Native adapters for Sui, Ethereum, Solana, Aptos, and Soroban.
- **Smart Network Switching**: Effortlessly toggle between `mainnet`, `testnet`, `devnet`, and `localnet`.
- **Domain Name Resolution**: Support for `.sui`, `.eth`, and other on-chain name services.
- **Premium UX**: High-fidelity terminal outputs, fuzzy typo correction, and sleek web interfaces.
- **Dockerized Infrastructure**: One-command deployment for the entire stack.

---

## 🤝 Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on how to add new chain adapters or improve the frontend.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
  Built with ❤️ by the txio Team
</div>
