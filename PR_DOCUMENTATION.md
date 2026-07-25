# PR Documentation: GitHub OAuth Account Linking & Workspace Header Refinement

## Summary

This PR implements GitHub OAuth account linking functionality and refines the workspace header layout.

### Backend

- Added `GitHubAccount` struct and `github_account` field to the `User` model in `backend/api/src/model/user.rs`
- Added `update_user_github_account` method to `AuthService` in `backend/api/src/services/auth_service.rs`
- Updated `github_callback` handler in `backend/api/src/api/handlers/auth_handler.rs` to link GitHub accounts after first OAuth authentication
- Added `github_unlink` endpoint in `auth_handler.rs` to allow users to disconnect their GitHub account
- Registered the `github_unlink` route in `backend/api/src/api/routers/auth_router.rs`

### Frontend

- Added "Unlink GitHub" button in `frontend/src/features/ProfilePage.tsx` under the GitHub connection field
- Added account linking section in `frontend/src/features/SignInPage.tsx` for GitHub OAuth flow
- Added account linking section in `frontend/src/features/GetStartedPage.tsx` for GitHub OAuth flow
- Streamlined the workspace header in `frontend/src/components/Layout.tsx` to reduce dead space:
  - Reduced header padding and gaps for a tighter layout
  - Made the search bar more compact (`w-48` instead of `w-64`)
  - Reduced logo and icon sizes for better visual balance
  - Narrowed the network selector dropdown

### Key Changes

| File | Change |
|------|--------|
| `backend/api/src/model/user.rs` | Added `GitHubAccount` struct and `github_account` field |
| `backend/api/src/services/auth_service.rs` | Added `update_user_github_account` method |
| `backend/api/src/api/handlers/auth_handler.rs` | Added GitHub account linking in callback and `github_unlink` handler |
| `backend/api/src/api/routers/auth_router.rs` | Registered `/auth/github/unlink` POST route |
| `frontend/src/features/ProfilePage.tsx` | Added Unlink GitHub button and connection UI |
| `frontend/src/components/Layout.tsx` | Streamlined header spacing and sizing |

## Environment Variables

Required environment variables for GitHub OAuth:

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_REDIRECT_URL`
- `FRONTEND_URL`

The GitHub redirect URL should be configured in the GitHub OAuth app and match the backend callback endpoint (`/auth/github/callback`).

## Notes

- The backend uses GitHub's `user:email` scope to request email access.
- If the GitHub profile does not include a public email, the callback also fetches the authenticated user's email list and selects the primary verified address.
- The generated JWT flow and existing auth state handling are reused so no duplicate auth path logic was added.
- The GitHub account linking is triggered on first OAuth login. Subsequent logins reuse the existing link.
- Users can unlink their GitHub account from the Profile page.

## Validation

- Backend compile validation was attempted, but `cargo` was not available in the current terminal environment.

## Follow-up

- Confirm `FRONTEND_URL` and GitHub redirect URL values in deployment.
- Add tests for GitHub callback path and UI coverage if desired.
- Consider adding GitHub connection status to the user profile display.
- Consider adding support for linking additional OAuth providers (Google, etc.)
