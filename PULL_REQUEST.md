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
- Added overrides (`brace-expansion`, `minimatch`, `ejs`, `filelist`, `jake`, `glob`, `axios`, `cross-spawn`, `micromatch`, `braces`, `path-to-regexp`) to [frontend/package.json](file:///home/semicolon/Pictures/txio/frontend/package.json), [desktop/package.json](file:///home/semicolon/Pictures/txio/desktop/package.json), and root [package.json](file:///home/semicolon/Pictures/txio/package.json) to resolve all high-severity audit vulnerabilities (`brace-expansion` / `minimatch` DoS GHSA-mh99-v99m-4gvg).
- Fixed Rust formatting (`cargo fmt`) in [cli/src/chains/sui.rs](file:///home/semicolon/Pictures/txio/cli/src/chains/sui.rs) and [backend/api/src/api/handlers/auth_handler.rs](file:///home/semicolon/Pictures/txio/backend/api/src/api/handlers/auth_handler.rs) for Rust CI compliance.

## Verification

- **Automated Tests**: Added unit tests in `frontend/src/lib/store.test.ts` covering comment creation, serialization, and deserialization.
- **Dependency Audit**: Resolved all `npm audit --audit-level=high` failures in Frontend and Desktop workspaces.
- **Rust CI**: Formatted all Rust codebase files according to standard `cargo fmt`.
- **Manual Verification**: Posted comments on active request tabs, refreshed the browser, and verified comments remain intact.
