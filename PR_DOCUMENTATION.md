# PR Documentation: GitHub OAuth Integration

## Summary

This PR adds GitHub OAuth authentication support to txio.

### Backend

- Added GitHub OAuth login and callback handlers in `backend/api/src/api/handlers/auth_handler.rs`.
- Added GitHub OAuth routes in `backend/api/src/api/routers/auth_router.rs`.
- The GitHub callback exchanges the authorization code for an access token and resolves the user's primary/verified email address.
- Reuses existing `oauth_login_or_register` logic to authenticate or create a new user account by email.

### Frontend

- Wired GitHub OAuth login redirects in:
  - `frontend/src/features/SignInPage.tsx`
  - `frontend/src/features/GetStartedPage.tsx`
  - `frontend/src/features/ProfilePage.tsx`
  - `frontend/src/components/AuthModal/tabs/GeneralTab.tsx`
- Users can now initiate GitHub OAuth from sign-in, sign-up, profile, and account settings flows.

## Environment Variables

Required environment variables for GitHub OAuth:

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_REDIRECT_URL`
- `FRONTEND_URL`

The GitHub redirect URL should be configured in the GitHub OAuth app and match the backend callback endpoint.

## Notes

- The backend uses GitHub's `user:email` scope to request email access.
- If the GitHub profile does not include a public email, the callback also fetches the authenticated user's email list and selects the primary verified address.
- The generated JWT flow and existing auth state handling are reused so no duplicate auth path logic was added.

## Validation

- Backend compile validation was attempted, but `cargo` was not available in the current terminal environment.

## Follow-up

- Confirm `FRONTEND_URL` and GitHub redirect URL values in deployment.
- Add tests for GitHub callback path and UI coverage if desired.
- Consider adding a persistent linked GitHub state to the user profile later so the UI can display connection status.
