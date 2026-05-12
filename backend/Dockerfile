# Build stage
FROM rust:1.80-slim as builder

# Install build dependencies
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the entire workspace
COPY . .

# Build both backend and cli
# Using --package flags to ensure we build specific workspace members
RUN cargo build --release --package txio-api --package txio

# Runtime stage
# We use the rust-slim image as the runtime to ensure 'cargo' is available for the TerminalService
FROM rust:1.80-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*

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
