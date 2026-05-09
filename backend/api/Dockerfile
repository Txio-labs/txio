FROM rust:1.80-slim as builder

WORKDIR /app
COPY . .

RUN cargo build --release --package api

FROM debian:bookworm-slim
WORKDIR /app
COPY --from=builder /app/target/release/api /app/api
COPY --from=builder /app/api/.env /app/.env

EXPOSE 3000
CMD ["./api"]
