# Registri Status Backlog ERPQu 1.0 (Backlog Status Register)

| Task ID | Status | Phase / Area | Evidence / Test Suite | Blocker | Notes |
|---|---|---|---|---|---|
| **QGOV-001** | `DONE` | Phase 0 — Baseline Audit | `cargo check` | None | Controlled baseline audit verified |
| **QGOV-003** | `DONE` | Phase 0 — Reproducible Rust Build | `cargo build` | None | Reproducible Rust build verified |
| **QGOV-004** | `DONE` | Phase 0 — Web/Mobile Installs | `npm check` | None | Package lock verified |
| **QGOV-005** | `DONE` | Phase 0 — Migration Taxonomy | `migrations/` | None | Additive-first SQL migrations |
| **QGOV-006** | `DONE` | Phase 0 — CI Foundation | `cicd_quality_gates_suite_tests.rs` | None | Quality gates M0..M6 |
| **QSEC-001..012** | `DONE` | Phase 1 — Security & Identity | `authz.rs`, `security_tests` | None | Default-deny & RBAC enforced |
| **QTEN-001..009** | `DONE` | Phase 2 — Multi-Tenancy | `tenant.rs`, `company.rs` | None | Strict tenant & company isolation |
| **QKRN-001..014** | `DONE` | Phase 3 — Kernel Foundations | `document.rs`, `outbox.rs` | None | Immutability & transactional outbox |
| **QACC-001..015** | `DONE` | Phase 4 — Accounting Kernel | `accounting_posting_engine.rs` | None | Idempotent GL posting & Decimal math |
| **QSTK-001..016** | `DONE` | Phase 5 — Stock Kernel | `stock_posting_engine.rs`, `bins` | None | Row locking & Moving Average cost |
| **QCOM-001..008** | `DONE` | Phase 6 — Selling & Buying | `commercial_graph.rs` | None | Source line traceability |
| **QAST-001..009** | `DONE` | Phase 7 — Asset & EAM | `asset_eam.rs` | None | Append-only custody & GL integration |
| **QWF-001..007** | `DONE` | Phase 8 — Platform Services | `platform_services.rs` | None | Exponential backoff & DeadLetter |
| **QMETA-001..012** | `DONE` | Phase 9 — ERPQu Metadata Kernel | `metadata_kernel.rs` | None | JSONB extensions & type validation |
| **QRPT-001..003** | `DONE` | Phase 10 — Reporting & API | `reporting_platform.rs` | None | Trial Balance report & API credentials |
| **QAPP-001..009** | `DONE` | Phase 11 — ERPQu App System | `app_system.rs` | None | AppManifest & SemVer compatibility |
| **QCRM-005** | `DONE` | Phase 12 — Operational ERP | `operational_erp.rs` | None | CRM, Project, HR, Rental, Support |
| **QMFG-001..010** | `DONE` | Phase 13 — Manufacturing & POS | `manufacturing_pos.rs` | None | Production Orders, Quality Hold & POS |
| **QIDN-001..008** | `DONE` | Phase 14 — Indonesia Localization | `indonesia_localization.rs` | None | e-Faktur, PPh & effective VAT rate |
| **QSRE-001..010** | `DONE` | Phase 15 — Production Engineering | `production_engineering.rs` | None | Observability, secrets redactor & backup |
| **QREL-001..006** | `DONE` | Phase 16 — ERPQu 1.0 Release Gate | `golden_invariants_suite_tests.rs` | None | 20 Golden Invariants verified 100% |
