# This Dockerfile must be built with the repository root as the Docker context.
# For platforms that assume the context equals the Dockerfile directory, use the
# repository-root Dockerfile instead.

# Build stage
FROM rust:1.88.0-slim-bookworm AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the full Rust workspace so Cargo can resolve all workspace members.
# This avoids missing-path issues when workspace members have deeper path dependencies.
COPY Cargo.toml Cargo.lock ./
COPY backend ./backend
COPY cli ./cli

# Build both backend and cli from the workspace root.
RUN cargo build --release --package txio-api --package txio

# Runtime stage
# Use a minimal base image for runtime to reduce attack surface
FROM debian:bookworm-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*

# Copy backend binary
COPY --from=builder /app/target/release/txio-api /app/api

# Copy CLI binary to system PATH so TerminalService can find it
COPY --from=builder /app/target/release/txio /usr/local/bin/txio

# Create a temporary directory for cargo operations if needed
RUN mkdir -p /app/temp

# Set environment variables
ENV RUST_LOG=info
ENV MONGO_URI=mongodb://mongodb:27017/txio

EXPOSE 3000

# The entrypoint is the backend API
CMD ["./api"]
