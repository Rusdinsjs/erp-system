# --- Build Stage ---
FROM rust:slim-bookworm as builder

# Install build dependencies
RUN apt-get update && apt-get install -y pkg-config libssl-dev protobuf-compiler && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy all files
COPY . .

# Set SQLX_OFFLINE to true for builds without a live DB
ENV SQLX_OFFLINE=true

# Build the application
# Note: We use --release for production optimization
RUN cargo build --release

# --- Runtime Stage ---
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y libssl3 ca-certificates curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the binary from the builder
COPY --from=builder /app/target/release/management-system /app/management-system
# Copy migrations for startup auto-migration
COPY --from=builder /app/migrations /app/migrations

# Expose the API port
EXPOSE 8080

# Run the app
CMD ["./management-system"]
