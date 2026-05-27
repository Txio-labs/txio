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

## What it is

If you've ever switched between four different CLIs, six RPC endpoints, and three address formats just to check balances on a Tuesday, txio is for you.

It's one interface across five chains. Same flags. Same commands. Predictable output. The CLI handles names (`aliphatic.sui`, `vitalik.eth`), the dashboard handles everything you'd rather not stare at as JSON, and the backend keeps it all fast.

## What's in the repo

| Path | What it is | Stack |
| :--- | :--- | :--- |
| [`/cli`](./cli) | The terminal you'll actually use day-to-day | Rust, Clap |
| [`/frontend`](./frontend) | Web dashboard for when raw JSON gets old | Next.js, React, Tailwind |
| [`/backend`](./backend) | API that caches and routes everything | Rust, Axum |
| [`/desktop`](./desktop) | Same app, Electron-wrapped (still cooking) | Electron |

---

## Get it running

You'll need Rust (stable), Node 20+, and Docker for the full stack.

```bash
git clone https://github.com/Kingvic300/Flow.git
cd Flow
npm install
```

For the full stack — backend, frontend, database — one command:

```bash
docker-compose up -d
```

Frontend boots on its usual port. API sits behind it.

## Try the CLI

```bash
cd cli
cargo run -- login                          # auth once, then forget about it
cargo run -- sui balance aliphatic.sui      # works with .sui names
cargo run -- --network testnet eth balance 0x...
```

Run `txio --help` for the rest.

---

## What it does

- **Five chains, one CLI.** Sui, Ethereum, Solana, Aptos, Soroban. Same commands, same flags.
- **Network switching that doesn't get in the way.** `--network testnet` and move on.
- **Names, not hex.** `.sui`, `.eth`, and friends resolve before the request fires.
- **Output you can read.** Formatted by default. `--pretty` for raw JSON when you want it.
- **One-command stack.** `docker-compose up` boots the whole thing.

---

## Contributing

Adding a new chain is one file in `cli/src/chains/` — implement the `ChainAdapter` trait and register it in the factory. Details in [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT. See [LICENSE](./LICENSE).
