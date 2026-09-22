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
- **txio-backend** — Rust/Axum API: MongoDB, JWT auth, OTP email (Brevo), AI console features (Groq).
- **Txio-telegram-bot** — internal ops tool (GitHub webhook → Telegram notifications); not part of the user-facing product.

## Capabilities and Constraints

- Multi-chain support: Sui (`@mysten/sui`, `@mysten/dapp-kit`), Ethereum (`wagmi`/`viem`), Solana, Aptos, Soroban/Stellar (`@stellar/stellar-sdk`, Lobstr wallet extension).
- RPC collections with history and environments, wallet integration/signing, PTB construction, SuiNS name resolution.
- Desktop app is a packaging wrapper, not a separate design surface — visual decisions apply to the web frontend and carry through.

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
