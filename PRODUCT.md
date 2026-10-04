# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Multi-chain Web3 developers — no single chain is treated as primary. Users work across Sui, Ethereum, Solana, Aptos, and Soroban/Stellar, and need to construct, test, and run RPC calls and transactions without juggling a separate chain-specific tool for each network.

## Product Purpose

Txio is a unified client — web/desktop IDE plus a CLI — for building, testing, and executing blockchain RPC calls and transactions across multiple chains from one consistent interface. Success means a developer can do the same job (build a call, sign it, run it, inspect the result) on any supported chain without switching tools.

## Positioning

Native chain semantics, not generic HTTP passthrough. Unlike a generic API client (e.g. Postman), Txio understands chain-specific RPC methods, constructs Move/PTB (Programmable Transaction Block) transactions for Sui, and integrates wallet signing directly — a neighboring "just send HTTP requests" tool could not truthfully claim this.

## Operating Context

Components across the workspace:
- **Txio-frontend** — Next.js web IDE, the primary user-facing surface.
- **txio-desktop** — Electron wrapper around the same frontend (not a distinct native design language).
- **txio-cli** — Rust CLI ("One terminal. Every chain."), shares core logic with the backend via a common `txio-api` Rust crate.
- **txio-backend** — Rust/Axum API: MongoDB, JWT auth, OTP email (Brevo).
- **txio-sdk** — `@txio/sdk`, TypeScript client for the public execution API (simulate, execute, history).
- **Txio-telegram-bot** — internal ops tool (GitHub webhook → Telegram notifications); not part of the user-facing product.

## Capabilities and Constraints

### Chains

- Sui (`@mysten/sui`, `@mysten/dapp-kit`), Ethereum/EVM (`wagmi`/`viem`), Solana, Aptos, Soroban/Stellar (`@stellar/stellar-sdk`, Lobstr wallet extension).
- Cardano has an adapter stub only: transactions throw "not implemented yet".
- Each chain has its own transaction adapter behind one lifecycle: validate, describe, simulate, execute. Chain-native features (Move calls and PTBs for Sui, Move entry functions for Aptos) are shown only for chains that support them.

### Build and run requests

- RPC Builder: JSON-RPC calls on every supported chain, with method autocomplete, parameter templates, headers, per-chain RPC health and failover across backup endpoints.
- Transaction builders per chain: EVM contract call (ABI, function signature or raw calldata), Solana instruction, Soroban contract call, Aptos entry function, Sui Move call and PTB construction.
- Contract Builder for chains with a Move, Solidity or Rust flow. Move Builder and Playground are partly simulated: real compilation and deploy are not wired yet.
- cURL import, variables, environments, assertions and hooks on requests.
- Collections (folders, nested), history with export, and a Collection Runner that runs a collection's requests in order.
- Recipes: reusable transaction templates, with built-in starters that work offline.
- Argument discovery and resolution for Sui packages, and SuiNS name resolution (Sui only).

### Simulate, review and sign

- Pre-sign simulation on every chain, using each chain's native dry run (Sui `dryRunTransactionBlock`, EVM `eth_call`/`estimateGas`, Solana and Soroban `simulateTransaction`, Aptos `simulate`).
- The review modal shows one normalized preview: balance changes, estimated fee, touched objects/accounts, events/logs, and the raw response. Fields a chain's simulation does not report are hidden for that chain, not faked. EVM shows no logs or state diff; Solana, Aptos and Stellar show no balance diff yet.
- Approval warnings on EVM (unlimited `approve`, `setApprovalForAll`), contract verification badge, and a mainnet execution warning before real funds move.
- Wallet signing per chain family, including Ledger hardware wallets. One linked wallet per chain family, managed on the Wallets page.

### Money movement

- Swap and bridge through an aggregator (LI.FI, falling back to SideShift), with quotes, orders and resume of interrupted swaps.
- Off-ramp quotes and orders (Transak).
- Token approvals manager (EVM only).

### Automation and safety

- Scheduled tasks, session keys, spend limits and webhooks, on one Automation & Safety screen.

### Inspect and monitor

- Object Explorer and analysis tabs for on-chain state and ownership, configurable block explorer per chain, terminal panel, dashboard, networks page with live health checks.

### Collaboration and platform

- Accounts with JWT auth and OTP email; workspaces and shared collections; comments on requests. Multi-user membership and invites are not modeled yet.
- Admin page.
- API keys and a public execution API (`/history`, `/transactions/simulate`, `/transactions/execute`) with a TypeScript client, `@txio/sdk`.
- CLI (`txio`): `call`, `balance`, `tx`, `object`/`account`, `history` and `block` per chain (`sui`, `ethereum`, `solana`, `aptos`, `soroban`), plus network switching, config, profiles, wallet and shell completion.
- Desktop app is a packaging wrapper, not a separate design surface: visual decisions apply to the web frontend and carry through.
- The AI console was removed: it did not support the native-chain-semantics positioning. Reintroduce only if narrowly scoped and chain-aware (e.g. explaining a failed simulation).

### Marketing claims to verify before repeating

The in-app Features page also mentions a privacy proxy, persistent WebSocket connections and team sync. Confirm each exists in code before using it in copy.

## Brand Commitments

- Name is styled lowercase, "txio", across docs and badges.
- Taglines in active use: "One terminal. Every chain." (CLI); "The professional IDE for Sui developers" (frontend); "Postman, but it speaks Sui (and a few others) natively" (backend).
- Typography: Space Grotesk + Inter (sans), JetBrains Mono (monospace) — a technical, developer-tool aesthetic, loaded via `next/font/google` and exposed as CSS variables.
- Dark-mode-first (`darkMode: "class"`, near-black `#0a0a0a`).
- Single accent color, `electric-violet` (`#a3a3a3`, a muted gray, not a saturated brand hue) — the system intentionally withholds color outside of network/status signals.

## Evidence on Hand

Pre-launch: no testimonials, case studies, usage data, or user feedback exist yet. Future work must not fabricate any of these.

## Product Principles

1. One consistent client beats N chain-specific tools — cross-chain coverage is the product, not a feature.
2. Native chain semantics (real transaction/RPC understanding, not raw HTTP) is the trust anchor that justifies choosing Txio over a generic API client.
3. Credibility with developers requires a precise, technical, no-nonsense visual and UX language — not consumer gloss.
