# Matriks Tasks Perbaikan - Management System ERP

**Tanggal Dibuat:** 24 Januari 2026  
**Status:** Active Development

---

## 📋 Legend

**Prioritas:**
- 🔴 **P0** - Kritis (Segera, 1-2 minggu)
- 🟡 **P1** - Penting (1-2 bulan)
- 🟢 **P2** - Enhancement (3-6 bulan)

**Status:**
- ⏳ **Todo** - Belum dimulai
- 🚧 **In Progress** - Sedang dikerjakan
- ✅ **Done** - Selesai
- ⏸️ **Blocked** - Terblokir
- 🔄 **Review** - Perlu review

**Effort:**
- 🟢 **Low** - < 1 minggu
- 🟡 **Medium** - 1-2 minggu
- 🔴 **High** - > 2 minggu

---

## 🔴 P0 - Tasks Kritis (Segera)

### 1. Error Handling Hardening

| Task ID | Task | File/Location | Status | Effort | Assignee | Notes |
|---------|------|---------------|--------|--------|-----------|-------|
| **EH-001** | Replace `.unwrap()` di `contract_service.rs` (line 56) | `src/application/services/contract_service.rs:56` | ⏳ Todo | 🟢 Low | Backend Dev | Parse year dengan proper error handling |
| **EH-002** | Replace `.unwrap()` di `email_service.rs` (line 87) | `src/application/services/email_service.rs:87` | ⏳ Todo | 🟢 Low | Backend Dev | ContentType parse error handling |
| **EH-003** | Replace `.unwrap()` di `rental_repository.rs` (line 364) | `src/infrastructure/repositories/rental_repository.rs:364` | ⏳ Todo | 🟢 Low | Backend Dev | Find by ID error handling |
| **EH-004** | Replace `.unwrap()` di `category_template_repository.rs` (line 53) | `src/infrastructure/repositories/category_template_repository.rs:53` | ⏳ Todo | 🟢 Low | Backend Dev | JSON serialization error handling |
| **EH-005** | Replace `.unwrap()` di `approval_service.rs` (line 131) | `src/application/services/approval_service.rs:131` | ⏳ Todo | 🟢 Low | Backend Dev | Review error context |
| **EH-006** | Improve error messages di main.rs | `src/main.rs` | ⏳ Todo | 🟢 Low | Backend Dev | `.expect()` messages lebih informatif |
| **EH-007** | Add error boundaries di frontend | `web-admin/src/components/ErrorBoundary.tsx` | ⏳ Todo | 🟢 Low | Frontend Dev | React error boundary component |
| **EH-008** | Wrap App dengan ErrorBoundary | `web-admin/src/main.tsx` | ⏳ Todo | 🟢 Low | Frontend Dev | Integrate error boundary |

**Total:** 8 tasks | **Effort:** ~1 minggu | **Priority:** 🔴 P0

---

### 2. Security Enhancements

| Task ID | Task | File/Location | Status | Effort | Assignee | Notes |
|---------|------|---------------|--------|--------|-----------|-------|
| **SEC-001** | Implement rate limiting middleware | `src/api/middleware/rate_limit.rs` | ⏳ Todo | 🟡 Medium | Backend Dev | Tower middleware dengan Redis |
| **SEC-002** | Add security headers middleware | `src/api/middleware/security_headers.rs` | ⏳ Todo | 🟢 Low | Backend Dev | HSTS, CSP, X-Frame-Options, etc. |
| **SEC-003** | Integrate rate limiting ke routes | `src/api/server.rs` | ⏳ Todo | 🟢 Low | Backend Dev | Apply middleware |
| **SEC-004** | Add password policy validation | `src/application/services/auth_service.rs` | ⏳ Todo | 🟢 Low | Backend Dev | Min length, complexity, etc. |
| **SEC-005** | Audit sensitive data logging | All services | ⏳ Todo | 🟡 Medium | Backend Dev | Review semua logging statements |
| **SEC-006** | Add CSRF protection | `src/api/middleware/csrf.rs` | ⏳ Todo | 🟡 Medium | Backend Dev | CSRF token validation |

**Total:** 6 tasks | **Effort:** ~2 minggu | **Priority:** 🔴 P0

---

### 3. Testing Infrastructure

| Task ID | Task | File/Location | Status | Effort | Assignee | Notes |
|---------|------|---------------|--------|--------|-----------|-------|
| **TEST-001** | Setup Rust test configuration | `Cargo.toml`, `tests/` | ⏳ Todo | 🟢 Low | Backend Dev | Configure test features |
| **TEST-002** | Setup Jest/Vitest untuk frontend | `web-admin/package.json` | ⏳ Todo | 🟢 Low | Frontend Dev | Install & configure |
| **TEST-003** | Add unit tests untuk AuthService | `tests/auth_service_tests.rs` | ⏳ Todo | 🟡 Medium | Backend Dev | Min 80% coverage |
| **TEST-004** | Add unit tests untuk AssetService | `tests/asset_service_tests.rs` | ⏳ Todo | 🟡 Medium | Backend Dev | Min 80% coverage |
| **TEST-005** | Add unit tests untuk WorkOrderService | `tests/work_order_service_tests.rs` | ⏳ Todo | 🟡 Medium | Backend Dev | Min 80% coverage |
| **TEST-006** | Add integration tests untuk auth flow | `tests/integration/auth_flow_tests.rs` | ⏳ Todo | 🟡 Medium | Backend Dev | Login, logout, token refresh |
| **TEST-007** | Add integration tests untuk asset CRUD | `tests/integration/asset_crud_tests.rs` | ⏳ Todo | 🟡 Medium | Backend Dev | Full CRUD operations |
| **TEST-008** | Add frontend component tests | `web-admin/src/components/**/*.test.tsx` | ⏳ Todo | 🟡 Medium | Frontend Dev | Critical components |
| **TEST-009** | Setup test coverage reporting | `.github/workflows/coverage.yml` | ⏳ Todo | 🟢 Low | DevOps | Codecov atau similar |

**Total:** 9 tasks | **Effort:** ~3-4 minggu | **Priority:** 🔴 P0

---

### 4. API Documentation

| Task ID | Task | File/Location | Status | Effort | Assignee | Notes |
|---------|------|---------------|--------|--------|-----------|-------|
| **DOC-001** | Add OpenAPI annotations ke handlers | All handlers | ⏳ Todo | 🟡 Medium | Backend Dev | Use utoipa atau similar |
| **DOC-002** | Generate OpenAPI spec | `docs/openapi.yaml` | ⏳ Todo | 🟢 Low | Backend Dev | Auto-generate dari annotations |
| **DOC-003** | Setup Swagger UI endpoint | `src/api/routes/docs.rs` | ⏳ Todo | 🟢 Low | Backend Dev | Serve Swagger UI |
| **DOC-004** | Document authentication flow | `docs/API_AUTH.md` | ⏳ Todo | 🟢 Low | Backend Dev | JWT flow documentation |

**Total:** 4 tasks | **Effort:** ~1-2 minggu | **Priority:** 🔴 P0

---

## 🟡 P1 - Tasks Penting (1-2 bulan)

### 5. Frontend Improvements

| Task ID | Task | File/Location | Status | Effort | Assignee | Notes |
|---------|------|---------------|--------|--------|-----------|-------|
| **FE-001** | Standardize loading states | All components | ⏳ Todo | 🟢 Low | Frontend Dev | Consistent loading UI |
| **FE-002** | Add skeleton screens | `web-admin/src/components/ui/Skeleton.tsx` | ⏳ Todo | 🟢 Low | Frontend Dev | Loading placeholders |
| **FE-003** | Improve error messages UX | All error handlers | ⏳ Todo | 🟢 Low | Frontend Dev | User-friendly messages |
| **FE-004** | Add loading indicators konsisten | All async operations | ⏳ Todo | 🟢 Low | Frontend Dev | Standardize |
| **FE-005** | Optimize bundle size | `vite.config.ts` | ⏳ Todo | 🟡 Medium | Frontend Dev | Code splitting, tree shaking |

**Total:** 5 tasks | **Effort:** ~2 minggu | **Priority:** 🟡 P1

---

### 6. Settings Module

| Task ID | Task | File/Location | Status | Effort | Assignee | Notes |
|---------|------|---------------|--------|--------|-----------|-------|
| **SET-001** | Create settings table migration | `migrations/xxx_create_settings.sql` | ⏳ Todo | 🟢 Low | Backend Dev | Key-value store |
| **SET-002** | Create SettingsService | `src/application/services/settings_service.rs` | ⏳ Todo | 🟡 Medium | Backend Dev | CRUD operations |
| **SET-003** | Create SettingsRepository | `src/infrastructure/repositories/settings_repository.rs` | ⏳ Todo | 🟢 Low | Backend Dev | Data access |
| **SET-004** | Create Settings API endpoints | `src/api/handlers/settings_handler.rs` | ⏳ Todo | 🟢 Low | Backend Dev | REST API |
| **SET-005** | Create Settings page UI | `web-admin/src/pages/Settings.tsx` | ⏳ Todo | 🟡 Medium | Frontend Dev | Settings management UI |
| **SET-006** | Add logo upload functionality | Settings page | ⏳ Todo | 🟡 Medium | Full-stack Dev | File upload + storage |
| **SET-007** | Add tax rates configuration | Settings page | ⏳ Todo | 🟢 Low | Full-stack Dev | Tax rates CRUD |
| **SET-008** | Add app name configuration | Settings page | ⏳ Todo | 🟢 Low | Frontend Dev | Dynamic app name |

**Total:** 8 tasks | **Effort:** ~3-4 minggu | **Priority:** 🟡 P1

---

### 7. Reporting Enhancement

| Task ID | Task | File/Location | Status | Effort | Assignee | Notes |
|---------|------|---------------|--------|--------|-----------|-------|
| **REP-001** | Add PDF export untuk asset reports | `src/application/services/report_service.rs` | ⏳ Todo | 🟡 Medium | Backend Dev | Use genpdf |
| **REP-002** | Add PDF export untuk work order reports | Report service | ⏳ Todo | 🟡 Medium | Backend Dev | WO reports PDF |
| **REP-003** | Add PDF export untuk financial reports | Report service | ⏳ Todo | 🟡 Medium | Backend Dev | Financial PDF |
| **REP-004** | Enhance charts dengan Recharts | All report pages | ⏳ Todo | 🟡 Medium | Frontend Dev | Better visualizations |
| **REP-005** | Add custom date range filters | Report pages | ⏳ Todo | 🟢 Low | Frontend Dev | Date picker filters |
| **REP-006** | Add export button ke semua reports | Report pages | ⏳ Todo | 🟢 Low | Frontend Dev | PDF/CSV export |

**Total:** 6 tasks | **Effort:** ~3-4 minggu | **Priority:** 🟡 P1

---

### 8. Performance Optimization

| Task ID | Task | File/Location | Status | Effort | Assignee | Notes |
|---------|------|---------------|--------|--------|-----------|-------|
| **PERF-001** | Audit database queries | All repositories | ⏳ Todo | 🟡 Medium | Backend Dev | Find N+1 queries |
| **PERF-002** | Add missing database indexes | Migration files | ⏳ Todo | 🟢 Low | Backend Dev | Index optimization |
| **PERF-003** | Optimize connection pool size | `src/main.rs` | ⏳ Todo | 🟢 Low | Backend Dev | Increase to 20-50 |
| **PERF-004** | Improve caching strategy | All services | ⏳ Todo | 🟡 Medium | Backend Dev | Better cache keys |
| **PERF-005** | Add query performance monitoring | Middleware | ⏳ Todo | 🟡 Medium | Backend Dev | Log slow queries |
| **PERF-006** | Frontend bundle optimization | `vite.config.ts` | ⏳ Todo | 🟡 Medium | Frontend Dev | Code splitting |

**Total:** 6 tasks | **Effort:** ~3-4 minggu | **Priority:** 🟡 P1

---

### 9. Documentation

| Task ID | Task | File/Location | Status | Effort | Assignee | Notes |
|---------|------|---------------|--------|--------|-----------|-------|
| **DOC-005** | Add doc comments ke semua services | All service files | ⏳ Todo | 🟡 Medium | Backend Dev | Rust doc comments |
| **DOC-006** | Add doc comments ke semua handlers | All handler files | ⏳ Todo | 🟡 Medium | Backend Dev | API documentation |
| **DOC-007** | Create user guide | `docs/USER_GUIDE.md` | ⏳ Todo | 🟡 Medium | Technical Writer | End-user documentation |
| **DOC-008** | Create developer guide | `docs/DEVELOPER_GUIDE.md` | ⏳ Todo | 🟡 Medium | Backend Dev | Setup, architecture |
| **DOC-009** | Update deployment guide | `docs/DEPLOYMENT.md` | ⏳ Todo | 🟢 Low | DevOps | Production deployment |

**Total:** 5 tasks | **Effort:** ~2-3 minggu | **Priority:** 🟡 P1

---

## 🟢 P2 - Tasks Enhancement (3-6 bulan)

### 10. Import/Export Features

| Task ID | Task | File/Location | Status | Effort | Assignee | Notes |
|---------|------|---------------|--------|--------|-----------|-------|
| **IMP-001** | Excel import untuk Assets | `web-admin/src/components/Assets/ImportAssetsModal.tsx` | ⏳ Todo | 🟡 Medium | Full-stack Dev | Parse Excel, validate, import |
| **IMP-002** | Excel import untuk Employees | New component | ⏳ Todo | 🟡 Medium | Full-stack Dev | Employee import |
| **IMP-003** | Excel template generator | Backend service | ⏳ Todo | 🟢 Low | Backend Dev | Generate template files |
| **IMP-004** | Bulk operations UI | Asset/Employee pages | ⏳ Todo | 🟡 Medium | Frontend Dev | Bulk edit/delete |

**Total:** 4 tasks | **Effort:** ~3-4 minggu | **Priority:** 🟢 P2

---

### 11. Mobile Optimization

| Task ID | Task | File/Location | Status | Effort | Assignee | Notes |
|---------|------|---------------|--------|--------|-----------|-------|
| **MOB-001** | Optimize mobile layouts | All mobile screens | ⏳ Todo | 🟡 Medium | Mobile Dev | Responsive design |
| **MOB-002** | Implement offline sync | Mobile app | ⏳ Todo | 🔴 High | Mobile Dev | Offline-first architecture |
| **MOB-003** | Add push notifications | Mobile app | ⏳ Todo | 🟡 Medium | Mobile Dev | Expo notifications |
| **MOB-004** | Performance optimization | Mobile app | ⏳ Todo | 🟡 Medium | Mobile Dev | Bundle size, rendering |

**Total:** 4 tasks | **Effort:** ~6-8 minggu | **Priority:** 🟢 P2

---

### 12. HRD Completion

| Task ID | Task | File/Location | Status | Effort | Assignee | Notes |
|---------|------|---------------|--------|--------|-----------|-------|
| **HRD-001** | Payroll calculation module | New service | ⏳ Todo | 🔴 High | Backend Dev | Salary calculation |
| **HRD-002** | Payslip generation | New service | ⏳ Todo | 🟡 Medium | Backend Dev | PDF payslips |
| **HRD-003** | Performance management | New module | ⏳ Todo | 🔴 High | Full-stack Dev | Reviews, goals |
| **HRD-004** | Training & development | New module | ⏳ Todo | 🟡 Medium | Full-stack Dev | Training records |

**Total:** 4 tasks | **Effort:** ~8-10 minggu | **Priority:** 🟢 P2

---

### 13. Advanced Analytics

| Task ID | Task | File/Location | Status | Effort | Assignee | Notes |
|---------|------|---------------|--------|--------|-----------|-------|
| **ANAL-001** | Advanced analytics dashboard | New page | ⏳ Todo | 🟡 Medium | Full-stack Dev | Custom KPIs |
| **ANAL-002** | Predictive maintenance | Analytics service | ⏳ Todo | 🔴 High | Backend Dev | ML-based predictions |
| **ANAL-003** | Custom report builder | New component | ⏳ Todo | 🔴 High | Full-stack Dev | Drag-drop builder |
| **ANAL-004** | Data export ke Excel/CSV | All analytics | ⏳ Todo | 🟢 Low | Backend Dev | Export functionality |

**Total:** 4 tasks | **Effort:** ~6-8 minggu | **Priority:** 🟢 P2

---

## 📊 Summary Statistics

### By Priority

| Priority | Tasks | Total Effort | Status |
|----------|-------|--------------|--------|
| 🔴 P0 (Kritis) | 27 | ~7-8 minggu | 0% Complete |
| 🟡 P1 (Penting) | 30 | ~12-14 minggu | 0% Complete |
| 🟢 P2 (Enhancement) | 16 | ~23-26 minggu | 0% Complete |
| **TOTAL** | **73** | **~42-48 minggu** | **0% Complete** |

### By Category

| Category | Tasks | Priority |
|----------|-------|----------|
| Error Handling | 8 | 🔴 P0 |
| Security | 6 | 🔴 P0 |
| Testing | 9 | 🔴 P0 |
| API Documentation | 4 | 🔴 P0 |
| Frontend | 5 | 🟡 P1 |
| Settings | 8 | 🟡 P1 |
| Reporting | 6 | 🟡 P1 |
| Performance | 6 | 🟡 P1 |
| Documentation | 5 | 🟡 P1 |
| Import/Export | 4 | 🟢 P2 |
| Mobile | 4 | 🟢 P2 |
| HRD | 4 | 🟢 P2 |
| Analytics | 4 | 🟢 P2 |

---

## 🎯 Quick Start - Top 10 Tasks untuk Mulai

1. **EH-007** - Add error boundaries di frontend (🟢 Low, 1 hari)
2. **EH-001** - Fix contract_service unwrap (🟢 Low, 1 jam)
3. **EH-002** - Fix email_service unwrap (🟢 Low, 1 jam)
4. **SEC-002** - Add security headers (🟢 Low, 2-3 jam)
5. **SEC-001** - Rate limiting setup (🟡 Medium, 2-3 hari)
6. **TEST-002** - Setup Jest/Vitest (🟢 Low, 1 hari)
7. **DOC-002** - Generate OpenAPI spec (🟢 Low, 1 hari)
8. **FE-001** - Standardize loading states (🟢 Low, 1 hari)
9. **PERF-003** - Optimize connection pool (🟢 Low, 1 jam)
10. **EH-006** - Improve main.rs error messages (🟢 Low, 1 jam)

**Total Quick Start:** ~1-2 minggu untuk 10 tasks pertama

---

## 📝 Notes

- **Update Status:** Update status task setiap kali ada progress
- **Effort Estimation:** Bisa berubah tergantung complexity yang ditemukan
- **Dependencies:** Beberapa tasks mungkin depend pada tasks lain
- **Review:** Setiap task yang selesai perlu code review sebelum merge

---

*Last Updated: 2026-01-24*
