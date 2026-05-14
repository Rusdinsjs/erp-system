# --- Chef Stage ---
FROM lukemathwalker/cargo-chef:latest-rust-latest AS chef
WORKDIR /app
# Install system dependencies needed for compilation
RUN apt-get update && apt-get install -y pkg-config libssl-dev protobuf-compiler && rm -rf /var/lib/apt/lists/*

# --- Planner Stage ---
FROM chef AS planner
COPY . .
# Compute a recipe file from the Cargo workspace
RUN cargo chef prepare --recipe-path recipe.json

# --- Builder Stage ---
FROM chef AS builder
COPY --from=planner /app/recipe.json recipe.json
# Build our project dependencies, not our application!
# This is the layer that Docker will cache!
RUN cargo chef cook --release --recipe-path recipe.json

# Now copy the actual source code
COPY . .
# Set SQLX_OFFLINE to true for builds without a live DB
ENV SQLX_OFFLINE=true
# Build the application
RUN cargo build --release

# --- Runtime Stage ---
FROM debian:bookworm-slim
# Install runtime dependencies
RUN apt-get update && apt-get install -y libssl3 ca-certificates curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy the binary and migrations
COPY --from=builder /app/target/release/management-system /app/management-system
COPY --from=builder /app/migrations /app/migrations

EXPOSE 8080
CMD ["./management-system"]
