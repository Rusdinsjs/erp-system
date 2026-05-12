# AI Coding Agent Instructions

## Project Overview
Enterprise Asset Management ERP system built with **Rust**, **Axum** web framework, **PostgreSQL**, and **Redis**. Follows **Domain-Driven Design (DDD)** with a layered 4-tier architecture.

## Architecture Layers (Critical Context)

The codebase uses a clean layered architecture. Each layer has distinct responsibilities and dependencies flow inward only:

```
API Layer (src/api/)
  ↓ depends on
Application Layer (src/application/)
  ↓ depends on
Domain Layer (src/domain/)
  ↓ pure business logic, no external dependencies
Infrastructure Layer (src/infrastructure/)
  ↓ implements domain interfaces, talks to DB/Redis
```

### Domain Layer (src/domain/)
- **Core business logic** - contains entities, value objects, errors, domain events
- **No external dependencies** - doesn't know about HTTP, databases, or JSON
- **Key files**: `entities/asset.rs`, `entities/user.rs`, `entities/work_order.rs`, `errors.rs`
- **Pattern**: Entity types are the source of truth for business rules

### Application Layer (src/application/)
- **Use case orchestration** - services that coordinate domain logic
- **Command/Query separation**: commands in `commands/`, queries in `queries/`
- **DTOs**: Data transfer objects define API contracts (in `dto/`)
- **Services** in `services/` call repositories (via traits) and coordinate domain entities
- **Example**: `AssetService.create_asset()` validates via domain entity, then calls repository

### Infrastructure Layer (src/infrastructure/)
- **Database access**: `repositories/` implements domain repository traits using SQLx
- **Redis cache**: defined in `cache/` for performance optimization
- **File storage**: image/document uploads to disk or object storage
- **Third-party adapters**: Email (lettre), PDF generation (genpdf)

### API Layer (src/api/)
- **HTTP entry points**: handlers in `handlers/`, routes in `routes/`
- **Middleware**: `auth.rs` extracts JWT claims, `rbac.rs` checks permissions, `rate_limit.rs` for throttling
- **OpenAPI docs**: auto-generated from handler attributes using `utoipa`

## Critical Development Workflows

### Local Development Setup
```bash
# Start Docker services (PostgreSQL + Redis)
docker-compose up -d postgres redis

# Run migrations
cargo install sqlx-cli --no-default-features --features rustls,postgres
sqlx migrate run

# Start server (auto-runs migrations)
cargo run
```

**OR use the convenience script:**
```bash
./start-dev.sh  # Sets up DB, migrations, and runs both backend + frontend
```

### Building & Testing
```bash
# Build debug binary
cargo build

# Run all tests
cargo test

# Run specific test file
cargo test --test auth_flow_tests

# Lint/format warnings
cargo clippy
cargo fmt
```

### Database Migrations
- **Location**: `migrations/` directory, numbered files (001, 002, etc.)
- **Tool**: SQLx compile-time checked queries
- **Run**: `sqlx migrate run` in CLI or automatic on `cargo run`
- **Create new**: `sqlx migrate add -r <description>` (creates reversible migration)

## Key Patterns & Conventions

### Error Handling Strategy
- **Domain errors**: `DomainError` enum in `src/domain/errors.rs` - business rule violations, validation, state transitions
- **App errors**: `AppError` in `src/shared/errors.rs` - HTTP response mapping
- **Pattern**: Domain returns `Result<T, DomainError>` → Application service maps to `AppError` → API returns HTTP status
- **Example**: `DomainError::NotFound` → `AppError::NotFound` (404) → HTTP 404 response

### Authentication & RBAC
- **JWT tokens**: Claims stored in `UserClaims` struct (sub=user_id, role, permissions)
- **Middleware flow**: 
  1. `auth_middleware` (in routes) decodes JWT and inserts claims into request extensions
  2. `rbac.rs::require_permission()` checks permission wildcards (e.g., "asset:read", "asset:*", "*")
- **Implement routes**: Use `#[axum::middleware::from_fn_with_state(auth_middleware)]` to protect endpoints
- **Permission wildcards**: "asset.*" matches "asset:read", "asset:write", etc.

### Async/Await Patterns
- **All async runtime**: Tokio with full features enabled
- **State management**: `AppState` shares database pool and services across handlers
- **Connection pooling**: 50 max, 5 min connections, 30s acquire timeout (see `main.rs`)

### Data Transfer Objects (DTOs)
- **Input DTOs**: Deserialized from JSON with validation attributes (in `application/dto/`)
- **Response DTOs**: Serialize back to JSON, often use `#[derive(Serialize)]` with serde
- **Validation**: Use regex patterns or manual `validate()` methods for business rules
- **Pattern**: `CreateAssetRequest` → `Asset` entity → `AssetResponse`

### Database Access with SQLx
- **Compile-time checked**: Queries validated against schema at compile time
- **Pattern**: Repository trait in domain → PostgresXyzRepository impl in infrastructure
- **Connection from state**: `state.pool` used in every handler/service
- **Transactions**: Use `pool.begin()` for multi-step operations (e.g., approval workflows)

### Service Architecture
- **Services as facades**: Each service in `src/application/services/` wraps domain logic
- **Dependency injection**: Services receive repository via constructor (trait-based)
- **Example**: `AssetService::create_asset(req: CreateAssetRequest, repo: impl AssetRepository)` → domain entity creation → repo.save()

## Project-Specific Conventions

### Module Organization
- **Single entity, single file**: `asset.rs` for Asset entity, not split across files
- **Handlers grouped by domain**: All asset handlers in `handlers/asset_handler.rs`, not scattered
- **Service per domain concept**: One `AssetService` handles all asset operations (CRUD, lifecycle, etc.)

### Testing Strategy
- **Integration tests**: In `tests/integration/` (e.g., `auth_flow_tests.rs`, `asset_crud_tests.rs`)
- **Test setup**: `test_utils::setup_app()` initializes full app with test database
- **Isolation**: Each test uses unique UUIDs to avoid conflicts in shared test DB

### Multi-Domain Features
**This system integrates multiple business domains:**
- **Asset Management**: Lifecycle tracking, depreciation, sensors, work orders
- **HRD/HR**: Employee records, leaves, timesheets, attendance
- **Finance**: Invoicing, billing, journals, fuel tracking
- **Inventory**: Stock levels, conversions, categories
- **Contracts & Rentals**: Contract lifecycle, approvals, billing

**Each domain has its own:**
- Entity files in `src/domain/entities/`
- Service in `src/application/services/`
- Repository in `src/infrastructure/repositories/`
- API handlers and routes in `src/api/handlers/` and `src/api/routes/`
- DTOs in `src/application/dto/`

### Approval Workflows
- **Pattern**: Multi-step approval with state transitions
- **Key service**: `ApprovalService` orchestrates approval logic
- **Domain entity**: `ApprovalWorkflow` tracks status and permissions
- **State flow**: PENDING → REVIEWED → APPROVED/REJECTED (see entity validation rules)

### Caching Strategy
- **Redis integration**: `RedisCache` implements `CacheOperations` trait
- **Lazy loading**: Some DTOs load related data via cache before returning
- **Configuration**: `RedisConfig` from environment (REDIS_URL)

## Cross-Component Communication Patterns

### Domain Events (Future/Optional)
- Structure exists in `src/domain/events/` but may not be fully implemented
- Events would be published after state transitions (e.g., AssetCreated, LoanApproved)
- Subscribers could trigger notifications or audit logs

### External Integrations
- **Email**: Via `lettre` SMTP (see `NotificationService`)
- **PDF Generation**: Via `genpdf` crate
- **Image Processing**: Via `image` crate for asset photos
- **CSV Import/Export**: Via `csv` crate

### Scheduler & Background Jobs
- **Cron scheduler**: `tokio-cron-scheduler` for periodic tasks
- **Started in**: `state.scheduler_service.start()` in `main.rs`
- **Usage**: Depreciation calculations, lease expiration checks, report generation

## Files to Reference When Implementing Features

| Task | Key Files |
|------|-----------|
| Add new API endpoint | `src/api/handlers/`, `src/api/routes/main_router.rs`, `src/application/services/` |
| Add permission checks | `src/api/middleware/rbac.rs`, define permission strings in route setup |
| Add new entity/domain logic | `src/domain/entities/`, then service in `src/application/services/` |
| Database queries | `src/infrastructure/repositories/` (implement repository trait) |
| New data validation | `src/application/validators/` or DTOs with serde validation |
| Error handling | `src/domain/errors.rs` for business errors, `src/shared/errors.rs` for HTTP mapping |
| Integration tests | `tests/integration/`, follow `auth_flow_tests.rs` pattern |
| Background tasks | `src/application/services/scheduler_service.rs` for cron jobs |

## Common Gotchas & Tips

1. **Always maintain layering**: Domain code must NOT import from api, application, or infrastructure layers
2. **Repository pattern is strict**: Use trait methods, avoid raw queries in services
3. **Async all the way**: All I/O is async; use `.await` and `#[tokio::main]` consistently
4. **SQLx migrations must run**: New db changes require migrations; tests fail if schema mismatched
5. **JWT expiry**: Set via `JWT_EXPIRATION_HOURS` env var (default 24)
6. **Redis optional**: System works without Redis; cache operations gracefully degrade
7. **RBAC at multiple levels**: Check permissions both in middleware and in service logic for sensitive operations

## References

- **Architecture deep-dive**: [docs/ARCHITECTURE_Layered_Overview.md](docs/ARCHITECTURE_Layered_Overview.md)
- **API Documentation**: [docs/openapi.yaml](docs/openapi.yaml)
- **Quick Start**: [md-ku/README.md](md-ku/README.md)
- **Local setup**: [start-dev.sh](start-dev.sh)
