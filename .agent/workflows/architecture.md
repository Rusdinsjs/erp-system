---
description: Asset Management project architecture and structure overview
---

# Project Architecture Overview

## Architecture Pattern: Domain-Driven Design (DDD) + Hexagonal

The project follows a layered architecture pattern:

```
┌─────────────────────────────────────────────────────┐
│                    API Layer                        │
│  (Routes, Handlers, Middleware, Responses)          │
├─────────────────────────────────────────────────────┤
│               Application Layer                     │
│  (Services, Commands, Queries, DTOs, Validators)    │
├─────────────────────────────────────────────────────┤
│                  Domain Layer                       │
│  (Entities, Value Objects, Events, Domain Errors)   │
├─────────────────────────────────────────────────────┤
│              Infrastructure Layer                   │
│  (Repositories, Database, Cache, Storage)           │
└─────────────────────────────────────────────────────┘
```

## Layer Responsibilities

### 1. Domain Layer (`src/domain/`)
- **Purpose**: Core business logic, entities, and rules
- **Contains**: Entity definitions, value objects, domain events
- **Principle**: No external dependencies

### 2. Application Layer (`src/application/`)
- **Purpose**: Use case orchestration
- **Contains**: Services, DTOs, validators, commands/queries
- **Principle**: Depends only on Domain layer

### 3. Infrastructure Layer (`src/infrastructure/`)
- **Purpose**: External system communication
- **Contains**: Repositories (DB), cache clients, file storage
- **Principle**: Implements interfaces defined by Application layer

### 4. API Layer (`src/api/`)
- **Purpose**: HTTP/REST interface
- **Contains**: Routes, handlers, middleware, response types
- **Principle**: Orchestrates Application services

## Key Design Patterns

### Repository Pattern
All database access goes through repository interfaces:
```rust
pub trait AssetRepository {
    async fn find_by_id(&self, id: Uuid) -> Result<Asset, Error>;
    async fn create(&self, asset: Asset) -> Result<Asset, Error>;
    async fn update(&self, asset: Asset) -> Result<Asset, Error>;
    async fn delete(&self, id: Uuid) -> Result<(), Error>;
}
```

### Service Pattern
Business logic is encapsulated in services:
```rust
pub struct AssetService {
    repository: Box<dyn AssetRepository>,
    // other dependencies
}
```

### CQRS (Command Query Responsibility Segregation)
- **Commands** (`src/application/commands/`): Write operations
- **Queries** (`src/application/queries/`): Read operations

## Technology Stack

| Layer | Technology |
|-------|------------|
| Web Framework | Axum |
| Database | PostgreSQL (SQLx) |
| Cache | Redis |
| Async Runtime | Tokio |
| Serialization | Serde |
| Authentication | JWT (jsonwebtoken) |
| Password Hashing | Argon2 |

## File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Entity | `snake_case.rs` | `asset.rs`, `work_order.rs` |
| Service | `*_service.rs` | `asset_service.rs` |
| Repository | `*_repository.rs` | `asset_repository.rs` |
| Handler | `*_handler.rs` | `asset_handler.rs` |
| Routes | `*_routes.rs` | `asset_routes.rs` |
| DTO | `*_dto.rs` | `asset_dto.rs` |

## Adding New Features

See `/add-feature` workflow for step-by-step guide.

## Common Commands

```bash
# Development
cargo run                    # Start server
cargo watch -x run          # Hot reload

# Testing
cargo test                  # Run all tests
cargo test --test asset     # Run specific test

# Database
sqlx migrate run            # Run migrations
sqlx migrate add NAME       # Create migration

# Build
cargo build --release       # Production build
```
