# Pull Request: Persist Request Comments (Discuss Tab)

## Description

Previously, posting a comment on a request via the "Discuss" tab (`appStore.postComment(requestId, content)`) only mutated in-memory Zustand store state. No persistence logic existed for comments, causing all comments to be lost on page reload.

This PR adds local storage persistence for request comments (`txio_comments`), ensuring comments are preserved across browser refreshes and sessions.

## Changes Made

### Frontend Core (`frontend/src/lib/store.ts`)
- Added `commentsStorageKey = 'txio_comments'`.
- Implemented `readStoredComments()` to load existing comments from `localStorage` on initial boot.
- Implemented `persistComments(comments)` to write updated comment records to `localStorage`.
- Updated `state.comments` initialization to use `readStoredComments()`.
- Updated `postComment(requestId, content)` to trigger `persistComments(newComments)` whenever a new comment is posted.

### Tests (`frontend/src/lib/store.test.ts`)
- Added unit tests in `appStore comments persistence` suite:
  - Verified `postComment` stores comments in `localStorage` under `txio_comments`.
  - Verified store re-initialization properly hydrates comments from `localStorage`.

### Security & CI Audit Fixes
- Added `overrides` section to [desktop/package.json](file:///home/semicolon/Pictures/txio/desktop/package.json) to resolve high-severity vulnerabilities (`axios`, `cross-spawn`, `micromatch`, `braces`, `path-to-regexp`) for `npm audit`.
- Updated `overrides` in [frontend/package.json](file:///home/semicolon/Pictures/txio/frontend/package.json) and [package.json](file:///home/semicolon/Pictures/txio/package.json) for consistent dependency security resolution.
- Cleaned up rust test import scopes in [cli/src/chains/sui.rs](file:///home/semicolon/Pictures/txio/cli/src/chains/sui.rs) for Rust CI clippy compliance.

## Verification

- **Automated Tests**: Added unit tests in `frontend/src/lib/store.test.ts` covering comment creation, serialization, and deserialization.
- **Dependency Audit**: Verified `overrides` satisfy `npm audit --audit-level=high` checks.
- **Manual Verification**: Posted comments on active request tabs, refreshed the browser, and verified comments remain intact.
