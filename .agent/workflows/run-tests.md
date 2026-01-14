---
description: How to run tests for the backend
---

# Running Backend Tests

## Unit Tests

// turbo
1. Run all unit tests:
```bash
cargo test
```

// turbo
2. Run tests with output:
```bash
cargo test -- --nocapture
```

3. Run specific test module:
```bash
cargo test asset_tests
```

## Integration Tests

1. Set up test database:
```bash
export DATABASE_URL="postgres://postgres:password@localhost/asset_management_test"
sqlx database create
sqlx migrate run
```

// turbo
2. Run integration tests:
```bash
cargo test --test '*'
```

## Code Coverage

1. Install cargo-llvm-cov:
```bash
cargo install cargo-llvm-cov
```

2. Generate coverage report:
```bash
cargo llvm-cov --html
open target/llvm-cov/html/index.html
```

## Linting & Formatting

// turbo
1. Check formatting:
```bash
cargo fmt --check
```

// turbo
2. Run clippy lints:
```bash
cargo clippy -- -D warnings
```
