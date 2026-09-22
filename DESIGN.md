---
name: Txio
description: "Postman, but it speaks Sui (and a few others) natively" — a dense, dark, multi-chain blockchain RPC and transaction console
colors:
  near-black: "#0a0a0a"
  surface-raised: "#18181b"
  accent-muted: "#a3a3a3"
  surface-hover: "rgba(163,163,163,0.05)"
  border-subtle: "rgba(163,163,163,0.06)"
  border-default: "rgba(163,163,163,0.09)"
  border-strong: "rgba(163,163,163,0.14)"
  status-success: "#34d399"
  status-warning: "#fbbf24"
  status-info: "#0ea5e9"
  status-localnet: "#e879f9"
typography:
  display:
    fontFamily: "Space Grotesk, Inter, sans-serif"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Space Grotesk, Inter, sans-serif"
    fontSize: "0.875rem"
    lineHeight: "1.375rem"
  label:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.75rem"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent-muted}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  input-default:
    backgroundColor: "{colors.near-black}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  modal-panel:
    backgroundColor: "{colors.surface-raised}"
    rounded: "{rounded.lg}"
    padding: "32px"
---

# Design System: Txio

## Overview

**Creative North Star: "The Chain Operator's Console"**

Txio reads as mission control for moving assets and calling contracts, not a browsing surface. The interface is dark by default and unconditionally so — there is no light-mode toggle, no page scroll, no marketing gloss inside the app shell. Density is the point: controls run small (`text-xs`, 24–38px control heights), padding stays tight, and screen space is spent on the request/response/collection panes a chain operator actually needs open at once.

Color is deliberately withheld. The palette is monochrome — near-black surfaces, a muted gray accent, and translucent white borders — with real hue reserved exclusively for status: which network you're pointed at, whether a call succeeded, whether you're one signature away from mainnet. That restraint is what makes the status colors legible; if everything were colorful, the one signal that matters (network risk) would stop standing out.

Depth comes from borders, not shadows. Surfaces sit flush and flat against each other, separated by hairline borders at three opacities; shadows are reserved for the few things that genuinely float above the page — modals, dropdowns, the network switcher.

**Key Characteristics:**
- Unconditional dark mode, fixed-viewport app shell (no body scroll)
- Monochrome base palette for chrome; a broader fixed accent palette is used deliberately at the content level (lists, cards, badges) for scannability
- Border-driven depth; shadow only on overlays
- Dense, compact controls sized for a working IDE, not a landing page
- Mono type for anything a developer reads as data (addresses, hashes, request bodies)

## Colors

The palette reads as near-black-and-gray at rest; the only color a user sees during normal operation is a status badge telling them which network they're on.

### Primary
- **Muted Steel** (`#a3a3a3`, token `accent-muted`): the system's only non-neutral accent — primary buttons, focus rings, active states. Intentionally desaturated rather than a saturated brand hue; it reads as "selected/actionable," not "branded."

### Neutral
- **Near-Black** (`#0a0a0a`, token `near-black`): base app background, primary surface, and input fill.
- **Raised Charcoal** (`#18181b`, token `surface-raised`): the next surface up — modal panels, elevated cards.
- **Hover Wash** (`rgba(163,163,163,0.05)`, token `surface-hover`): the only feedback a resting surface gets on hover; no color shift, just a faint lightening.
- **Border, Subtle / Default / Strong** (`rgba(163,163,163,0.06 / 0.09 / 0.14)`): the three-step border ramp that does almost all of the system's depth and separation work, from barely-there dividers up to the visible edge of an active input.

### Status (Semantic)
- **Success / Mainnet** (`#34d399`, token `status-success`): live network indicator, successful transaction state.
- **Warning / Testnet** (`#fbbf24`, token `status-warning`): non-production network indicator, destructive-adjacent confirmations.
- **Info / Devnet** (`#0ea5e9`, token `status-info`): informational network indicator; doubles as the default input focus ring color.
- **Localnet** (`#e879f9`, token `status-localnet`): local/dev-only network indicator, kept visually distinct from the other three so it's never confused with a real network.

### Category Accents (Content-Level)
Outside of chrome, a broader palette (blue, amber, emerald, sky, fuchsia, violet) is used freely and consistently as per-item accent color in lists and grids — dashboard stat cards, feature/tool lists, object-type badges (coin vs. generic object), theme/chain pickers. Each item's color is fixed and repeated everywhere that item appears (e.g. RPC always reads blue, gas/energy always amber), so the palette functions as a scannability aid, not decoration-for-its-own-sake. This is deliberately broader than the chrome rule below and should not be flattened to monochrome.

### Named Rules
**The One-Signal Rule (chrome only).** In navigation, focus rings, borders, and app-shell chrome, color exists to answer exactly one question — "which network, and is it safe?" Chrome never reaches for a color just because the palette allows it. Content-level iconography (see Category Accents) is a separate, intentionally colorful system and is not bound by this rule.

## Typography

**Display / Body Font:** Space Grotesk, with Inter as fallback (sans stack)
**Label/Mono Font:** JetBrains Mono, monospace

**Character:** A technical, unfussy pairing — geometric sans for structure, monospace for anything that is actually data (addresses, hashes, JSON, request/response bodies). Note: the app currently ships without `next/font` wired up, so these fonts are configured but not yet loading in the browser (falls back to system sans-serif/monospace) — this spec documents the intended typography; wiring the fonts back in is an implementation bug, not a design decision.

### Hierarchy
- **Display** (600 weight, tight `-0.02em` tracking, 1.2 line-height): headings and section titles; Space Grotesk only, no Inter fallback in practice.
- **Body** (400 weight, 0.875rem / 1.375rem line-height): default UI text, labels, descriptions.
- **Label** (JetBrains Mono, 0.75rem, often uppercase with wide tracking): micro-labels, badges, and anything below body size — the scale runs unusually small down to `text-[9px]`/`text-[10px]` for the tightest UI chrome.

### Named Rules
**The Data-Is-Mono Rule.** Anything that is literally data the user might copy — an address, a hash, a request body, a response payload — renders in JetBrains Mono. Anything that is UI language renders in the sans stack.

## Layout

Fixed-viewport app shell: `<html>` forces `class="dark"` unconditionally and the body sets `overflow: hidden` — this is an IDE-style layout with internal scroll regions (panels, panes), not a scrolling document. `md:` is the dominant responsive breakpoint by a wide margin; `xl`/`2xl` are barely used, meaning the design targets a working desktop viewport rather than tuning for ultra-wide displays. Modals cluster around `max-w-md`; the few document-style/marketing pages (docs, auth) use `max-w-7xl`/`max-w-2xl` containers instead of the app shell's edge-to-edge panels. Density is compact throughout: dominant spacing is 4–16px (`py-1`–`py-3`, `px-2`–`px-4`), with control heights around 24–38px.

## Elevation & Depth

Borders-first, not shadow-first. At rest, every surface is flat; separation between panels, list rows, and sections comes from the three-step border ramp (`border-subtle` / `border-default` / `border-strong`), not from tonal shifts or shadows. Shadow is reserved for things that float above the base layout — modals, dropdown menus, the network switcher — where it signals "this is temporarily on top," not "this is important."

### Shadow Vocabulary
- **Overlay** (`shadow-2xl`): modal panels, open dropdown/select menus.
- **Raised** (`shadow-lg` / `shadow-xl`): floating CTAs and secondary overlays that sit above content but below a full modal.

### Named Rules
**The Flat-at-Rest Rule.** Nothing in the base layout casts a shadow. If it's not floating above the page, it separates with a border, not a shadow.

## Shapes

Radius is generous and rounds up as elements get more prominent: small controls and inputs use an 8px radius, elevated surfaces (dropdown menus, cards) step up to 12px, and modal panels round further to 16px. Fully circular (`rounded-full`) is reserved for pills — status badges and avatar/icon containers — never for rectangular content. Borders are hairline and low-opacity throughout (white at 5–14% opacity on dark surfaces); nothing uses a heavy, high-contrast stroke.

## Components

Controls should feel precise and restrained: compact, quiet, low-decoration, matching a dense IDE rather than a marketing surface. No shared primitive library exists yet (buttons, cards, and inputs are hand-rolled per usage) — the patterns below describe the de facto convention already in use, to converge toward rather than a component library already built.

### Buttons
- **Shape:** 8px radius (`rounded-lg`) for standard controls, 12px (`rounded-xl`) for larger primary actions.
- **Primary:** `{colors.accent-muted}` background, white text, bold weight, compact padding (8–12px vertical, 16–24px horizontal).
- **Hover / Focus / Active:** subtle opacity/shadow shift on hover, `active:scale-95` on press, `disabled:opacity-40` when unavailable — feedback should stay quiet, not add color.

### Badges / Pills
- **Style:** fully rounded (`rounded-full`), background at 10% opacity of the semantic status color, text and border at full-strength status color.
- **Use:** network indicators (mainnet/testnet/devnet/localnet), success/error/warning states — the only place saturated color appears in the UI.

### Modals
- **Backdrop:** near-black at 60% opacity with blur.
- **Panel:** `{colors.surface-raised}` background, hairline border, 16px radius, `shadow-2xl`, 32px internal padding.

### Inputs / Fields
- **Style:** `{colors.near-black}` background, hairline border, 12px radius, monospace type for data-entry fields (addresses, payloads).
- **Focus:** border shifts to `status-info` (sky) with a matching focus ring — the one place a status color does double duty as a UI-state color.

### Navigation (Sidebar)
- **Style:** flush with the app background, separated from the main pane by a single hairline border on its trailing edge; no separate background tint from the base surface.

## Do's and Don'ts

### Do:
- **Do** treat color as a status signal only — network identity, success/warning/error — never decoration.
- **Do** separate surfaces with the border ramp (subtle/default/strong), not with shadows or background-color shifts.
- **Do** render anything the user might copy (address, hash, payload) in JetBrains Mono.
- **Do** keep controls compact — this is a working tool, not a marketing surface.

### Don't:
- **Don't** introduce a new saturated color into chrome (nav, focus rings, borders, buttons) — that layer has exactly one non-neutral color family (status) and one muted neutral accent.
- **Don't** invent a new content-level category color ad hoc — reuse the fixed color already assigned to that category elsewhere (RPC is always blue, gas is always amber, etc.) rather than picking a fresh one per screen.
- **Don't** add shadows to resting, non-floating surfaces — that's a border's job.
- **Don't** use `.replace()` or template-literal interpolation to build a Tailwind class at runtime (e.g. `getColor(x).replace('bg-', 'hover:bg-')`); Tailwind only generates CSS for class names it can see literally in source, so the derived class silently never renders. Write out each literal class string instead (a switch/map of full strings is fine).
