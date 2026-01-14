---
description: How to run the backend development server
---

# Running the Backend Development Server

## Prerequisites
1. Rust toolchain installed (rustup)
2. PostgreSQL database running
3. `.env` file configured with DATABASE_URL

## Steps

// turbo
1. Ensure PostgreSQL is running and the database exists:
```bash
psql -c "CREATE DATABASE asset_management;" 2>/dev/null || echo "Database exists"
```

// turbo
2. Run database migrations:
```bash
sqlx database create
sqlx migrate run
```

// turbo
3. Start the development server:
```bash
cargo run
```

The server will start at `http://localhost:8080` (or the port specified in .env).

## Hot Reload (Development)
For hot reload during development, use cargo-watch:
```bash
cargo install cargo-watch
cargo watch -x run
```

## Verify Server is Running
```bash
curl http://localhost:8080/health
```
Expected response: `{"status":"ok"}`
