# TODO
- [ ] Inspect `backend/Dockerfile` and confirm mismatch with root `Dockerfile`
- [x] Update `backend/Dockerfile` to copy full workspace (`backend ./backend`, `cli ./cli`) instead of partial subset

- [ ] Keep build command the same (`cargo build --release --package txio-api --package txio`)
- [ ] Build and verify: `docker build` using `backend/Dockerfile` with repo root context
- [ ] Build and verify: `docker-compose build api`

