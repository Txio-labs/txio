# Fix: admin email squatting (#314)

## Problem
Admin access was granted by matching JWT `claims.email` against `ADMIN_EMAILS`.
Anyone could `POST /auth/register` with a reserved admin address before the real
admin signed up and receive a fully privileged JWT.

## Fix
1. **`User.is_admin`** — durable flag; `require_admin` loads the user by JWT `sub` and checks this flag only.
2. **`ADMIN_EMAILS`** — reserved roster: blocked from self-service register, OAuth signup, and update-email.
3. **`bootstrap_admin` binary** — creates/promotes admins out-of-band for emails listed in `ADMIN_EMAILS`.

## Operator migration
```bash
# 1. Set reserved emails
ADMIN_EMAILS=admin@txio.io

# 2. Provision admin (creates user if missing)
cargo run -p txio-api --bin bootstrap_admin -- \
  --email admin@txio.io --password 'your-strong-password'

# 3. Existing deployments that relied on email matching: promote each real admin once
```

Existing users without `is_admin` lose admin API access until bootstrapped (intentional).
