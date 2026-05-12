# Asset Management Backend

Enterprise Asset Management Backend built with **Rust**, **Axum**, and **PostgreSQL** using **Domain-Driven Design (DDD)** architecture.

## 🏗️ Architecture

```
src/
├── api/                    # Presentation Layer
│   ├── handlers/          # Request handlers
│   ├── middleware/        # Auth, RBAC, rate limiting
│   ├── routes/            # Route definitions
│   └── server.rs          # Server configuration
├── application/            # Application Layer
│   ├── dto/               # Data transfer objects
│   ├── services/          # Business logic services
│   └── validators/        # Input validation
├── domain/                 # Domain Layer
│   ├── entities/          # Business entities
│   ├── events/            # Domain events
│   ├── errors.rs          # Domain errors
│   └── value_objects/     # Value objects
├── infrastructure/         # Infrastructure Layer
│   ├── cache/             # Redis cache
│   ├── database/          # Database connection
│   ├── repositories/      # Data access
│   └── messaging/         # Event publishing
└── shared/                 # Shared utilities
```

## 🚀 Quick Start

### Prerequisites

- Rust 1.75+
- PostgreSQL 16+
- Redis 7+ (optional)
- Docker & Docker Compose (optional)

### Development Setup

1. **Clone and setup environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

2. **Start database (Docker)**
```bash
docker run -d --name postgres-asset \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=asset_management \
  -p 5434:5432 postgres:16
```

3. **Run migrations**
```bash
cargo install sqlx-cli --no-default-features --features rustls,postgres
sqlx migrate run
```

4. **Run the server**
```bash
cargo run
```

### Docker Compose

```bash
# Start all services
docker-compose up -d

# Run migrations
docker-compose --profile migrate up migrate

# View logs
docker-compose logs -f backend
```

## 📚 API Documentation

API documentation is available at `/docs/openapi.yaml` (OpenAPI 3.0 format).

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/auth/login` | POST | User authentication |
| `/api/assets` | GET/POST | List/Create assets |
| `/api/assets/:id` | GET/PUT/DELETE | Asset CRUD |
| `/api/work-orders` | GET/POST | Work orders |
| `/api/loans` | GET/POST | Asset loans |
| `/api/sensors/readings` | POST | IoT sensor data |
| `/api/dashboard/stats` | GET | Analytics |
| `/api/rbac/roles` | GET | Role management |

## 🔐 Authentication

All protected endpoints require a JWT token:

```bash
# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password"}'

# Use token
curl http://localhost:8080/api/assets \
  -H "Authorization: Bearer <token>"
```

## 🎯 Features

- ✅ **Asset Lifecycle Management** - Track assets from procurement to disposal
- ✅ **Multi-tenancy** - Organization-based data isolation
- ✅ **RBAC** - Role-based access control with granular permissions
- ✅ **Work Orders** - Maintenance scheduling with checklists
- ✅ **Loan Management** - Asset borrowing workflow
- ✅ **IoT Integration** - Sensor data collection and alerts
- ✅ **Depreciation** - Automatic asset depreciation calculation
- ✅ **Audit Logging** - Complete change history
- ✅ **Notifications** - In-app and email notifications
- ✅ **Reporting** - Dashboard and analytics

## 🗄️ Database Schema

10 migration files covering:
- Organizations & multi-tenancy
- Asset loans workflow
- Work orders & checklists
- RBAC (roles, permissions)
- Audit logging with triggers
- Depreciation calculations
- IoT sensor timeseries
- Report definitions
- Notification system

## 🧪 Testing

```bash
# Run all tests
cargo test

# Run with logging
RUST_LOG=debug cargo test -- --nocapture
```

## 📦 Building for Production

```bash
# Build release binary
cargo build --release

# Docker build
docker build -t asset-backend .
```

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection URL | Required |
| `REDIS_URL` | Redis connection URL | Optional |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRATION_HOURS` | Token expiry | 24 |
| `SERVER_HOST` | Server bind address | 0.0.0.0 |
| `SERVER_PORT` | Server port | 8080 |
| `RUST_LOG` | Log level | info |

## 📄 License

MIT License
