# TODO

- [ ] Update `docker-compose.yml` to explicitly reference the root `Dockerfile` for the `api` service (`dockerfile: ./Dockerfile`).
- [ ] Re-run `docker compose build api --no-cache` to verify the COPY paths (`cli/`, `backend/`, `Cargo.toml`) exist in the build context.
- [ ] If COPY still fails, inspect which Dockerfile is actually used in the build logs and unify Dockerfile usage.
- [ ] After Docker build passes, address the separate frontend Tailwind/PostCSS (Turbopack) failure if it still occurs.

