## Summary

Add a per-user `token_version` claim to JWTs so that logout, password reset, and password change immediately invalidate all previously issued tokens. This replaces the current no-op logout and fixes the inability to revoke tokens after credential changes.

## Motivation

The logout endpoint was a client-side-only operation — it returned a success message but never invalidated the JWT server-side. Tokens are stateless HS256 JWTs valid for 24 hours with no deny-list or versioning mechanism. This means:

- A stolen/leaked token remains valid for up to 24 hours with no way to revoke it.
- After `reset_password_with_otp` or `update_user_password_by_email`, previously issued tokens still work.
- There is no way to force-invalidate sessions on credential compromise.

## Approach

A monotonically increasing `token_version: u32` field is stored on each user document. It is embedded in the JWT `Claims` at issuance and validated on every authenticated request by comparing against the current DB value. Bumping the version invalidates all outstanding tokens for that user.

## Changes

### Core

| File | Change |
|------|--------|
| `model/user.rs` | Added `token_version: u32` field (`#[serde(default)]` for backward compat with existing documents) |
| `utils/auth_jwt.rs` | Added `token_version` to `Claims` struct; `generate_token` now accepts and embeds the version; `Claims` extractor looks up the user from DB via request extensions and rejects tokens with a mismatched version |
| `repositories/user_repository.rs` | Added `bump_token_version(user_id)` — atomic `$inc` on the `token_version` field |
| `services/auth_service.rs` | `generate_token` calls pass `user.token_version`; added `logout(user_id)` method; `reset_password_with_otp` and `update_user_password_by_email` now bump `token_version` after credential change |
| `api/handlers/auth_handler.rs` | `logout` now extracts `Claims` and calls `service.logout(&claims.sub)` |
| `main.rs` | Inject `mongodb::Client` into request extensions via `Extension(db_client.clone())` so the `Claims` extractor can access the DB without requiring a specific state type |

### Ancillary (pre-existing clippy fixes)

20 pre-existing `clippy::warnings` across `collection_service.rs`, `workspace_service.rs`, `ai_service.rs`, `sui_service.rs`, `terminal_service.rs`, `workspace.rs`, and several repository files were fixed to pass the `cargo clippy --all-targets -- -D warnings` CI gate. No behavioral changes.

## Backward Compatibility

- `token_version` uses `#[serde(default)]`, so existing MongoDB documents without the field deserialize as `0`.
- Tokens issued before this change will have no `token_version` claim, which deserialises as `0` via `#[serde(default)]`. These tokens remain valid as long as the user's DB `token_version` is also `0` (which it is for existing users until they log out or reset their password).
- No database migration required — MongoDB is schemaless.

## Testing

5 unit tests added in `utils/auth_jwt::tests`:

| Test | Verifies |
|------|----------|
| `generate_token_includes_token_version` | Token embeds the provided version; `sub` and `email` roundtrip correctly |
| `token_version_zero_is_valid` | Zero (default for legacy users) works without error |
| `verify_rejects_wrong_secret` | Tokens signed with one secret are rejected by another |
| `claims_roundtrip_preserves_token_version` | Arbitrary version values survive encode → decode |
| `user_missing_token_version_deserialises_as_zero` | User JSON without `token_version` field defaults to `0` |

CI gates pass:
- `cargo fmt -- --check` ✅
- `cargo clippy -p txio-api --all-targets -- -D warnings` ✅
- `cargo test -p txio-api` ✅ (5/5)
