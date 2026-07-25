# Analisa Mendalam — management-system

> Generated: 2026-07-24 | Reconstructed from session data

---

## 1. RINGKASAN PROJEK

| Item | Detail |
|------|--------|
| **Nama** | management-system |
| **Ukuran** | 5.9 GB |
| **Bahasa Backend** | Rust (Axum 0.7) |
| **Bahasa Frontend** | TypeScript (React 19 + Vite 7) |
| **Mobile** | Expo SDK 54 / React Native 0.81 |
| **Database** | PostgreSQL 17 |
| **Cache** | Redis 7 |
| **File Rust** | 283 file .rs |
| **SQL Migrations** | 133 file .sql |
| **Docker Compose** | 4 services (postgres, redis, backend, ollama) |

---

## 2. ARSITEKTUR — Rust Workspace (5 Crates)

```
management-system/
├── crates/
│   ├── core/           — shared types, DB, auth
│   ├── finance/        — chart of accounts, sales, purchase, expenses, GL
│   ├── assets/         — asset CRUD, QR, lifecycle
│   ├── ops/            — work orders, maintenance, loans, rentals
│   └── api-server/     — HTTP binary (Axum handlers, routes, OpenAPI)
├── web-admin/          — React 19 + Vite 7 + Tailwind v4
├── mobile/             — Expo 54 / React Native
├── migrations/         — 133 SQL migration files
└── Dockerfile          — 3-stage cargo-chef build
```

### Dependency Flow

```
api-server → assets, finance, ops
assets     → core
finance    → core
ops        → core
core       → (no internal deps)
```

---

## 3. TECH STACK — Backend

| Kategori | Libraries |
|----------|-----------|
| **Web** | axum 0.7, tower-http 0.5 (cors, trace, fs, limit) |
| **Async** | tokio 1.0 (full features) |
| **DB** | sqlx 0.7 (postgres, chrono, json, rust_decimal, uuid, migrate) |
| **Cache** | deadpool-redis 0.22, redis 0.32 |
| **Auth** | jsonwebtoken 9.0, argon2 0.5 |
| **Finance** | rust_decimal 1.35 |
| **PDF** | genpdf 0.2 |
| **Email** | lettre 0.11 (smtp, tokio1, native-tls) |
| **Cron** | tokio-cron-scheduler 0.15 |
| **Images** | image 0.24 (webp) |
| **API Docs** | utoipa 4.2, utoipa-swagger-ui 6.0 |
| **CSV** | csv 1.4 |

---

## 4. TECH STACK — Frontend

| Item | Detail |
|------|--------|
| **Framework** | React 19 |
| **Build Tool** | Vite 7 |
| **Styling** | Tailwind CSS v4 |
| **State** | Zustand + TanStack React Query |
| **Charts** | Recharts |
| **PDF** | jspdf |
| **QR** | qrcode.react |
| **Export** | html-to-image |

---

## 5. TECH STACK — Mobile

| Item | Detail |
|------|--------|
| **Framework** | Expo SDK 54 / React Native 0.81 |
| **Navigation** | React Navigation |
| **State** | Zustand |
| **UI** | React Native Paper |
| **Camera** | expo-camera + expo-image-picker |
| **Signature** | react-native-signature-canvas |

---

## 6. DOCKER / INFRASTRUCTURE

### Dockerfile (3-Stage Build)

1. **Chef/Planner** — cargo-chef untuk dependency caching
2. **Builder** — `SQLX_OFFLINE=true`, `cargo build --release`
3. **Runtime** — debian:bookworm-slim, exposes port 8080

### docker-compose.yml (4 Services)

| Service | Image | Port | Limit | Notes |
|---------|-------|------|-------|-------|
| **postgres** | postgres:17-alpine | 5436 | 512MB | Custom pg_hba.conf (trust auth internal) |
| **redis** | redis:7-alpine | 6382 | 256MB | appendonly |
| **backend** | built from Dockerfile | 8080 | 1024MB | depends_on postgres+redis healthy |
| **ms-ai-ollama** | ollama:latest | — | 4096MB | profile: "ai" |

Named volumes: postgres_data, redis_data, ollama_data
Network: mgmt-network

---

## 7. MODUL-MODUL APLIKASI

### 7.1 Asset Management (Stable) ✅
- CRUD aset lengkap (create, read, update, delete)
- QR Code generation per aset
- Lifecycle 14 state: `planned → ordered → received → in_use → under_maintenance → ...`
- Approval workflows untuk role_level > 2
- Bulk operations (bulk create, bulk update)
- Export CSV + PDF
- Optimistic locking via `version` field
- Soft delete (archive) menggantikan hard delete
- Vehicle details (JSONB): STNK, pajak, KIR expiry tracking
- Asset groups: alat berat, kendaraan, infrastruktur
- Spesifikasi JSON dinamis per kategori
- Document management per aset
- Search full-text + multi-filter

### 7.2 Master Data Engine (Stable) ✅
- Recursive tree structures (categories, departments, locations)
- Smart dropdowns dengan search
- Quick-add inline dari modal

### 7.3 Auth & RBAC (Stable) ✅
- JWT authentication (Bearer token)
- Password hashing: Argon2
- 5-level role hierarchy:
  ```
  Super Admin → Admin → Manager → Staff → Viewer
  ```
- 3 admin spesialis: admin_alat_berat, admin_kendaraan, admin_infrastruktur
- Permission-based access: `asset.read`, `asset.create`, `finance.journal.create`, dll
- Wildcard support: `*` dan prefix matching `asset.*`
- Per-handler permission checks via `require_permission()`
- `admin_only_middleware` untuk user CRUD

### 7.4 Financial Module (Stable) ✅
- Chart of Accounts (CoA) — tree structure
- General Ledger
- Journal entries
- Cash/Bank transactions
- Sales flow: Quote → Order → Shipment → Invoice
- Purchase flow: Quote → Order → Shipment → Bill
- Expense tracking
- Reports: Ledger, Trial Balance, Balance Sheet, Income Statement
- CapEx/OpEx analysis

### 7.5 Work Order & Maintenance (Advanced) ✅
- Work Order lifecycle:
  ```
  pending → approved → assigned → in_progress → completed → verified → finalized
  ```
- Automated preventive maintenance SPK generation (daily 01:00 AM scheduler)
- Cost tracking per work order
- Task checklist dengan foto
- Maintenance templates
- Parts management per work order
- Sign-off workflow
- Overdue tracking
- Analytics: maintenance trends, cost analysis

### 7.6 Loans Module (Advanced) ✅
- NIK-based checkout
- Condition logging (check-out condition vs return condition)
- Overdue tracking
- Approval workflow
- Loan analytics

### 7.7 Rental & Client Management (Advanced) ✅
- Timesheet tracking
- Billing engine (overtime/standby multipliers)
- PDF invoice generation (genpdf)
- Email with PDF attachment
- Client management
- Contract management
- Handover photo gallery (dispatch/return)
- Asset expenses tracking
- Fuel management

### 7.8 HRD Module ✅
- Employee management
- Department management (tree structure)
- Attendance (check-in/check-out + face scan)
- Leave management (request → approve/reject)
- User-employee linking

### 7.9 Sensors & IoT ✅
- Sensor readings per asset
- Threshold configuration
- Alert system (active alerts + acknowledge)
- Time-range queries

### 7.10 Audit Module ✅
- Audit sessions (start → submit records → close)
- Progress tracking
- Audit logs

### 7.11 Dashboard & Analytics ✅
- Dashboard stats
- Recent activity feed
- Depreciation summary
- PDF export
- Analytics: maintenance trends, condition distribution, status distribution, costs

### 7.12 Reports ✅
- Asset reports (CSV + PDF)
- Inventory PDF
- Maintenance reports
- CapEx/OpEx analysis

### 7.13 Lifecycle Management ✅
- State machine transitions
- Request-based transitions (with approval)
- Valid transitions query
- History tracking

### 7.14 Notifications ✅
- WebSocket real-time notifications
- Notification CRUD per user
- Unread count
- Mark as read (single + bulk)

---

## 8. DDD ARCHITECTURE — 4 Layer

### 8.1 Domain Layer (Paling Dalam)

**Prinsip:** Zero external dependencies. Pure business logic.

#### Entities (35+ modules)
| Entity | Fields | Catatan |
|--------|--------|---------|
| `Asset` | 32 fields | id, asset_code, name, category_id, location_id, status, condition, serial_number, brand, model, purchase_date/price, residual_value, useful_life_months, version (optimistic locking) |
| `WorkOrder` | — | Lifecycle states, approval workflow |
| `Rental` | — | Timesheet, billing, multipliers |
| `Loan` | — | NIK checkout, condition logging |
| `Finance` | — | CoA, journals, invoices |
| `Employee` | — | HRD, attendance, leave |
| Plus 25+ more | — | approval_workflow, audit, category, client, contract, department, fuel, inventory, journal, leave, location, maintenance, notification, sensor, setting, tax_renewal, user, vendor, dll |

#### Value Objects
| VO | Detail |
|----|--------|
| `Money` | amount (Decimal) + currency. Methods: idr(), usd(), add(), subtract(), multiply(), format() |
| `AssetCode` | Newtype wrapper. Validasi: non-empty, 3-50 chars, alphanumeric/hyphens/underscores. Auto-generate: PREFIX-SEQUENCE |

#### Events
`SystemEvent` enum (serde tag-based):
- `ExpenseCreated`, `PurchaseOrderCreated`
- `LoanRequested/Approved/Rejected/CheckedOut/Returned/Overdue`
- `LowStockAlert`, `AssetStatusChanged`
- `FuelLogCompleted`, `WorkOrderFinalized`
- `RentalInvoiceGenerated`

#### Errors
`DomainError` enum (11 variants):
- `NotFound`, `ValidationError`, `BusinessRuleViolation`
- `InvalidStateTransition`, `Unauthorized`, `Conflict`
- `ExternalServiceError`, `BadRequest`, `Internal`
- `Storage`, `Database`

Maps langsung ke HTTP status via `IntoResponse`.

---

### 8.2 Application Layer (Bisnis Logic)

**Prinsip:** Orchestrates domain objects. Contains service logic, DTOs, commands/queries.

#### Services
`AssetService` (1096 lines) — contoh representative:
- `list()` — paginated, department/asset_group filter
- `get_by_id()` — Redis cache get/set
- `get_detail_by_id()` — complex joins + JSONB + aggregates
- `search()` — full-text + multi-filter + sort
- `create()` / `create_with_executor()` — approval gate, code uniqueness, vehicle details
- `bulk_create()` — transactional bulk
- `update()` — optimistic locking, cache invalidation
- `change_state()` — state machine transition via `AssetState`
- `sell_asset()` — approval gate, journal entry (accounting), state transition
- `delete()` — soft delete (archive)
- `check_upcoming_expiries()` — vehicle doc expiry notifications

#### DTOs
- `PaginationParams` (page, per_page with defaults/clamps)
- `PaginatedResponse<T>` — meta: total, page, per_page, total_pages, has_next, has_prev
- `ApiResponse<T>` — {success, message, data}
- 16 DTO modules: asset, asset_expense, audit, category, common, contract, contract_template, conversion, employee, inventory, leave, loan, maintenance, rental, rental_timesheet, tax_renewal, user

#### Commands/Queries
Modules exist tapi masih kosong (CQRS belum di-formalisasi).

---

### 8.3 Infrastructure Layer (Penyimpanan & Integrasi)

**Prinsip:** Implements domain traits. Bridges domain ke dunia luar (DB, cache, messaging).

#### Repositories
32 repository modules + base `Repository<T, ID>` trait:
- `find_by_id`, `find_all`, `count`, `create`, `update`, `delete`

`AssetRepository` (904 lines) — representative:
- `find_detail_by_id()` — complex joins + JSONB vehicle_details + aggregate subqueries
- `list()` — paginated, department/asset_group filter, excludes archived
- `search()` — 10+ parameter search, ILIKE, multi-value CSV filters, sort
- `create()` / `create_with_executor()` — transactional insert
- `update()` — optimistic locking (`WHERE id=$1 AND version=$33`)
- `delete()` — soft delete (sets status='archived')
- `upsert_vehicle_details()` — JSONB update
- `update_odometer()` — partial JSONB merge
- `get_status_distribution()` — analytics
- `create_document()`, `find_documents_by_asset_id()`
- `bulk_update_status/location/department()`
- `find_expiring_vehicles()` — complex JSONB date queries

#### Cache
`CacheOperations` trait (object-safe):
- `get_raw`, `set_raw`, `delete`, `exists`, `incr`, `set_nx`
- `RedisCache` menggunakan `deadpool_redis`
- `CacheKey` builder: consistent key naming (asset, asset_list, user_session)
- `CacheJson` blanket impl untuk typed JSON access

#### Event Bus
`EventBus` — `tokio::sync::broadcast::Sender<SystemEvent>`:
- `new()`, `publish()`, `subscribe()`
- In-memory only (belum persistent)

#### Event Publisher
`EventPublisher` — `broadcast::Sender<String>`:
- Serializes events sebagai `event_type:json` strings

---

### 8.4 API Layer (Paling Luar)

**Prinsip:** HTTP translation. Extracts requests, validates, calls services, returns responses.

#### AppState (God Object — ~45+ fields)
```rust
pub struct AppState {
    pub asset_service: AssetService,
    pub auth_service: AuthService,
    pub finance_service: FinanceService,
    pub rental_service: RentalService,
    pub work_order_service: WorkOrderService,
    // ... 40+ service fields
    pub pool: PgPool,
    pub ws_manager: Arc<WebSocketManager>,
    pub jwt_config: JwtConfig,
    pub event_bus: EventBus,
}
```

Manual dependency injection — semua di-construct di `AppState::new()`.

#### Routes (150+ endpoints)

| Group | Contoh Endpoints | Count |
|-------|-----------------|-------|
| **Auth** | POST /api/auth/login, /register | 2 |
| **Assets** | CRUD, bulk, search, export, sell, documents | 12 |
| **Work Orders** | CRUD, approve, assign, start, complete, verify, finalize, cancel, signoff, tasks, parts, apply-template | 18 |
| **Loans** | CRUD, approve, checkout, return, reject, analytics | 11 |
| **Finance** | Accounts, journals, reports (ledger, trial-balance, balance-sheet, income-statement), sales (quotes/orders/shipments/invoices), purchase, expenses, cash-bank | 20+ |
| **HRD** | Employees, departments, attendance (check-in/out, face scan), leaves | 18 |
| **Rental** | Rental, client, contract, timesheet, billing | 15+ |
| **Sensors** | Readings, thresholds, alerts | 6 |
| **Reports** | Assets PDF, inventory PDF, maintenance, capex-opex | 5 |
| **Analytics** | Maintenance trends, condition/status distribution, costs | 4 |
| **Dashboard** | Stats, activity, depreciation, export PDF | 4 |
| **Audit** | Sessions, records, progress, logs | 6 |
| **Lifecycle** | Transitions, request, history, valid-transitions, status | 7 |
| **RBAC** | Roles, permissions, user roles/permissions | 6 |
| **Notifications** | List, unread, count, mark-read | 5 |
| **Users** | CRUD (admin only) | 4 |
| **Profile** | Get/update profile, change password, upload avatar | 4 |
| **Maintenance** | Templates, CRUD | 8 |

#### Middleware
| Middleware | Fungsi |
|-----------|--------|
| `auth_middleware` | Extract Bearer token → decode → insert `UserClaims` |
| `require_permission("x.y")` | Factory → closure → cek `claims.permissions` (wildcard support) |
| `admin_only_middleware` | Allow only `admin` atau `super_admin` |
| `org_scope_middleware` | Super admin bypass; others need `claims.org` |
| Rate limiting | Request rate limiter |
| Security headers | Security response headers |
| CORS | localhost:3000, 5173, 5174, 5175 |

#### Static Assets
- SwaggerUI at `/swagger-ui`
- File uploads at `/api/uploads` via `ServeDir`
- WebSocket at `/ws` for real-time notifications

---

## 9. REQUEST LIFECYCLE

```
Client Request
    │
    ▼
CORS Layer
    │
    ▼
Rate Limit Middleware
    │
    ▼
Security Headers Middleware
    │
    ▼
Route Matching (main_router.rs)
    │
    ├── Public? → Handler langsung
    │
    └── Protected? → auth_middleware → Handler
                         │
                         ▼
                    Extract Bearer token
                    Decode JWT → UserClaims
                    Insert claims ke request extensions
                         │
                         ▼
                    require_permission("asset.read")?
                         │
                    ┌────┴────┐
                    │ Match?  │
                    └────┬────┘
                         │ Yes
                         ▼
                    Handler(State<AppState>)
                         │
                         ▼
                    Service.method()
                    (AssetService.create())
                         │
                         ▼
                    Validation (DTO, business rules)
                    Approval gate?
                         │
                    ┌────┴────┐
                    │ Level > │ → ApprovalService.request_approval()
                    │ threshold│
                    └────┬────┘
                         │
                         ▼
                    Domain Logic
                    (state machine, money calc)
                         │
                         ▼
                    Repository.method()
                    (AssetRepository.create())
                         │
                    ┌────┴────┐
                    │ PgPool  │ → SQLx query
                    │ query   │ → optimistic locking
                    └────┬────┘
                         │
                         ▼
                    Cache Invalidation
                    (RedisCache.delete())
                         │
                         ▼
                    EventBus.publish(SystemEvent)
                         │
                         ▼
                    ApiResponse<T> → JSON response
```

---

## 10. SCHEDULER (Automated Jobs)

| Job | Schedule | Fungsi |
|-----|----------|--------|
| **Preventive Maintenance** | Daily 01:00 AM | Auto-generate preventive WO dari template |
| **Vehicle Tax Renewal** | Periodic | Cek STNK/pajak expiry → notifikasi |
| **Vehicle KIR Renewal** | Periodic | Cek KIR expiry → notifikasi |
| **Overdue Loans** | Periodic | Flag overdue loans → notifikasi |
| **Low Stock Alert** | Periodic | Cek inventory threshold → notifikasi |

---

## 11. EVALUASI KUALITAS

### Kekuatan ✅
1. **Domain purity** — Domain layer zero external dependencies
2. **State machine** — 14-state lifecycle untuk aset, approval workflows
3. **Optimistic locking** — Version field mencegah concurrent write conflicts
4. **Soft delete** — Archive menggantikan hard delete
5. **Comprehensive RBAC** — 5-level hierarchy + 3 admin spesialis + wildcard permissions
6. **Financial double-entry** — Journal entries otomatis saat sell/transaction
7. **Real-time notifications** — WebSocket
8. **133 migrations** — Database schema sangat matang
9. **Offline build support** — SQLX_OFFLINE untuk CI/Podman
10. **Swagger/OpenAPI** — Auto-generated API docs

### Kelemahan / Area Perbaikan ⚠️
1. **AppState God Object** — ~45+ field, manual DI tanpa framework
2. **CQRS belum formal** — `commands/` dan `queries/` module masih kosong
3. **No Unit of Work** — Domain events tidak persistent (in-memory broadcast only)
4. **Repository concret** — Tidak pakai trait abstraction (sulit test mock)
5. **Dashboard.tsx = 1,043 lines** — Refactor candidate di frontend
6. **Redundant deps** — classnames + clsx, date-fns + dayjs
7. **Mobile hardcoded** — Tasks screen masih mock data
8. **Reporting** — CSV only, belum ada visual charts + PDF export lengkap
9. **Settings** — Missing global config (logo, tax rate, app name)
10. **Bulk ops** — Belum ada Excel import untuk assets/employees

### Known Bugs
- `docker-compose.yml`: REDIS_URL pointing ke postgres port
- `billing_service.rs` line ~193: duplicate `rate_basis = "hourly"`
- WebSocket auth perlu review

---

## 12. STATISTIK

| Metric             | Value                 |
| ------------------ | --------------------- |
| Rust source files  | 283                   |
| Rust total lines   | ~93,902               |
| SQL migrations     | 133                   |
| Entity modules     | 35+                   |
| Repository modules | 32                    |
| API endpoints      | 150+                  |
| Service modules    | 45+                   |
| DTO modules        | 16                    |
| Domain events      | 12                    |
| Scheduler jobs     | 5                     |
| RBAC roles         | 5 levels              |
| Asset states       | 14                    |
| Project size       | 5.9 GB                |
|                    | ~5.5 GB (reclaimable) |

---

*Analisa ini di-generate dari source code aktual di `/home/rus/Ngoding/management-system/`*
