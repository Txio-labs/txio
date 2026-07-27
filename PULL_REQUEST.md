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

## Verification

- **Automated Tests**: Added unit tests in `frontend/src/lib/store.test.ts` covering comment creation, serialization, and deserialization.
- **Manual Verification**: Posted comments on active request tabs, refreshed the browser, and verified comments remain intact.
