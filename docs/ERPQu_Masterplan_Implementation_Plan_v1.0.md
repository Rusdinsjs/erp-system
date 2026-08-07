# ERPQu Masterplan & Implementation Plan v1.0

**Program:** ERPQu — ERP Platform & Enterprise Asset Operations  
**Baseline audit:** repository state at commit `5d55165`  
**Execution model:** incremental modular-monolith refactor; implemented in small, verifiable work packages with Agent AI Antigravity  
**Status:** Approved direction; implementation blueprint  

**Task-ID namespace:** all tasks in this masterplan use the `Q...` prefix (for example `QSEC-002`) so they do not collide with the older January task matrix already present in the repository. The masterplan's phase order supersedes the old P0/P1/P2 ordering; still-valid legacy items should be absorbed into the relevant `Q...` work package rather than executed by their old priority alone.

**Planning verification:** the repository snapshot available while this masterplan was prepared is still at `5d55165`, matching the accepted deep-audit baseline. Older January documents that described the system as “production ready” predate the deeper security/ledger/platform audit and are therefore historical context, not release criteria. Their already-completed fixes (such as frontend error boundary/error-handling cleanup and security headers) should be preserved, but they do not replace the new phase gates below.

---

## 1. Executive decision

ERPQu will **not** be rewritten from scratch and will **not** pursue feature-count parity with ERPNext first. The program will transform the existing product into a **Frappe-inspired ERP Platform** (Typed DDD ERP Core + Lean Metadata Kernel + Controlled App Extensibility) by hardening the kernel first, then expanding functionality.

The architectural equilibrium follows a strict motto: **"Generic where convenient, typed where correctness matters."** Customizations are split into 3 tiers: Level 1 (No-code metadata), Level 2 (Configuration), and Level 3 (Typed Rust Code).

The required order is:

**Containment & reproducibility → security → tenancy/company → document & transaction kernel → accounting → stock → selling/buying → EAM integration → workflow/jobs → metadata platform → reporting/API/print → app system → operational modules → manufacturing/quality/POS → localization → production/cloud/ecosystem.**

The plan deliberately puts correctness before menu breadth. A phase is complete only when its automated exit gate passes; a screen or route being present is not evidence of completion.

### 1.1 Product identity

ERPQu should evolve into two layers:

1. **ERPQu Kernel** — metadata, documents, authorization, workflow, audit, files, jobs, events, reporting, naming, app registry and generic APIs.
2. **ERPQu Apps** — accounting, stock, selling, buying, assets/EAM, maintenance, HR, CRM, projects, rental, manufacturing, quality, POS and localizations.

The differentiator remains **Asset/EAM + field/mobile operations**, not imitation of ERPNext's UI or module count.

### 1.2 Non-negotiable architectural principles

- Keep Rust + Axum + PostgreSQL + SQLx + Redis + React + React Native/Expo.
- Remain a **modular monolith** until there is measured evidence that a service boundary is needed.
- Use **typed Rust domain logic** for accounting, stock, payroll, manufacturing and other invariant-heavy domains.
- Use a **metadata-driven layer** for forms, layouts, permissions, workflow, reports, custom fields and generic entities.
- Security is server-side and **default deny**. Frontend permission gates are UX only.
- Money, rates and valued quantities use `Decimal`, never `f64`.
- Submitted accounting and stock history are append-only/immutable; correction is performed through cancellation/reversal/amendment.
- Any business action whose validity depends on GL or stock posting must commit atomically in one database transaction.
- Critical internal consistency must not depend on an in-memory event consumer.
- Cross-process asynchronous effects use a transactional outbox and durable job infrastructure.
- Tenant, Company and Department/Cost Center are separate concepts.
- Production migrations are forward-only, additive-first and tested against a copy of realistic data.
- Every implementation work package ends with tests and evidence. No “done by inspection.”

---

## 2. What must be preserved, changed and deferred

### Preserve

- Rust/Axum and SQLx/PostgreSQL foundation.
- Existing Asset/EAM capability and maintenance workflows.
- React admin and React Native/Expo clients.
- Existing approval history, versioning ideas, Redis, OpenAPI scaffolding, scheduler and event foundations where reusable.
- Domain/service/repository intent, but with boundaries made real rather than cosmetic.

### Change systematically

- Centralize authorization instead of ad-hoc handler checks.
- Replace mutable finance/stock summaries as sources of truth with immutable ledgers.
- Introduce a universal document lifecycle and transaction unit-of-work.
- Separate tenant, company and organizational dimensions.
- Normalize workflow, file ownership, jobs, event delivery and notification routing.
- Move from manual DTO/route/form repetition toward a hybrid metadata platform.
- Move from “modules that call each other” to explicit posting contracts and document graphs.

### Defer until the kernel is ready

- Manufacturing/MRP.
- POS.
- Quality Management.
- Marketplace/dynamic third-party native plugins.
- Microservices.
- Large UI redesigns unrelated to correctness.
- Broad new modules that bypass the new document, permission, GL or stock kernels.

---

## 3. Program governance for Antigravity

### 3.1 One work package = one reviewable change

Each task ID in this plan is intended to be one Antigravity work package. A work package may span several commits if necessary, but it should produce one coherent review unit and must not silently include unrelated cleanup.

For every task Antigravity must:

1. Confirm the current Git HEAD and compare it with the audited baseline.
2. Inspect the exact call path, schema and tests relevant to the task before editing.
3. State the invariant being protected and the expected files/migrations to change.
4. Add or strengthen a failing regression test before or alongside the fix whenever practical.
5. Implement only the scoped change.
6. Run the narrow tests first, then the phase-required test suite.
7. Report migration impact, compatibility impact and rollback/recovery considerations.
8. Return evidence: tests run, results, remaining risks and follow-up task IDs.

If the live repository has diverged materially from commit `5d55165`, Antigravity must first create a **baseline delta note**. The plan's invariant and ordering remain authoritative; file paths and implementation details may be adapted to current HEAD.

### 3.2 Definition of Ready (DoR)

A task is READY only when:

- all prerequisite task IDs are DONE;
- its affected domain and data ownership are understood;
- its migration path is safe for existing data;
- an observable acceptance test can be written;
- no unresolved architecture decision changes the task's meaning.

### 3.3 Definition of Done (DoD) for every code task

- The requested invariant is implemented server-side.
- New/changed paths have automated tests.
- `cargo fmt --check` passes.
- `cargo clippy --workspace --all-targets` passes with agreed warning policy.
- `cargo test --workspace` passes, or the task documents a strictly narrower temporary gate approved by the project owner.
- SQL migrations apply successfully from the previous supported schema.
- A fresh database can be bootstrapped without demo users/password resets.
- For web changes: clean `npm ci`, lint, typecheck and relevant tests pass.
- For mobile changes: typecheck and relevant tests pass.
- OpenAPI/API contracts are updated when externally visible behavior changes.
- No secret, token, DB URL or sensitive payload is logged.
- No unrelated generated/debug artifact enters the repository.
- Task evidence and next task status are recorded.

### 3.4 Change-control rules

- Do not combine a security boundary change with a large schema refactor in one package.
- Do not drop old columns/tables in the same release that introduces replacements. Use add → backfill → dual-read/write if needed → enforce → remove in a later release.
- Do not rename every crate/package to `erpqu-*` early. Rebrand user-facing names first; extract/rename crates only as boundaries stabilize.
- Do not introduce a new dependency unless its role, maintenance status and security impact are justified.
- Do not allow a module to write directly to GL or Stock Ledger tables; use posting engines.
- Do not make a “temporary” public file, WebSocket, admin or debug route in production builds.

---

## 4. Target architecture

### 4.1 Logical target

```text
Web / Mobile / Integrations
            |
        ERPQu API
            |
       ERPQu Kernel
   /    /    |     \      \
Authz Docs Workflow Metadata Jobs/Files
            |
        ERPQu Apps
   /      |      |       \
Accounting Stock Selling Assets/EAM ...
            |
        PostgreSQL
```

### 4.2 Target crate/app boundaries

The end-state can converge toward:

```text
crates/
  erpqu-kernel/
    metadata/
    document/
    authz/
    workflow/
    audit/
    files/
    jobs/
    events/
    reporting/
    naming/
    app_registry/
  erpqu-accounting/
  erpqu-stock/
  erpqu-selling/
  erpqu-buying/
  erpqu-assets/
  erpqu-maintenance/
  erpqu-hr/
  erpqu-crm/
  erpqu-projects/
  erpqu-rental/
  erpqu-manufacturing/
  erpqu-quality/
  erpqu-pos/
  erpqu-infrastructure/
  erpqu-api/
```

This is an end-state, not a big-bang directory move. In early phases, new kernel abstractions may live inside the current `crates/core` until their interfaces are stable. Extraction should happen only when dependency direction can be enforced.

### 4.3 Dependency direction

- API depends on Kernel and App interfaces.
- Apps depend on Kernel contracts.
- Infrastructure implements ports required by Kernel/Apps.
- Accounting and Stock expose posting services; other Apps call those services rather than their repositories/tables.
- Kernel never contains asset depreciation, sales pricing or manufacturing-specific rules.
- UI depends on API contracts and metadata, not database knowledge.

---

## 5. Milestone map and phase gates

| Milestone | Phases | Outcome | Gate to leave milestone |
|---|---|---|---|
| M0 — Controlled Baseline | 0 | Reproducible build, clean repo, frozen baseline | Fresh clone/build/migration succeeds |
| M1 — Secure Foundation | 1–3 | Security, tenant/company context, lifecycle/UoW | P0 exploit tests + transaction invariants green |
| M2 — Trusted ERP Core | 4–6 | Accounting, stock, selling/buying graph | GL/stock reconciliation + end-to-end transaction tests green |
| M3 — ERPQu Operational Core | 7–8 | EAM integrated with kernel; workflow/jobs durable | Asset/EAM cannot diverge from GL/stock; async delivery is durable |
| M4 — ERPQu Platform | 9–11 | Metadata, generic APIs/reporting/print, app system | A sample custom entity/app works without hand-writing full CRUD/UI |
| M5 — Functional Expansion | 12–14 | HR/CRM/Projects, manufacturing/quality/POS, localization | Every module uses shared kernels; no side ledgers |
| M6 — Production & Ecosystem | 15–16 | Cloud operations, upgrade/restore, release readiness | SLO/backup/upgrade/security/UAT gates green |

No phase should be skipped because the later phases assume the earlier invariants exist.

---

## 6. Phase 0 — Controlled baseline, rename and reproducibility

**Purpose:** establish a trustworthy starting point and remove sources of accidental drift before structural changes.

### QGOV-001 — Baseline delta audit

**Implement:** record current HEAD, compare it with `5d55165`, classify changed files by security/finance/stock/platform/UI, and note which prior findings are already fixed or invalidated.  
**Acceptance:** `docs/architecture/baseline-delta.md` identifies HEAD, audit baseline and material deltas; no code behavior changes.

### QGOV-002 — ERPQu naming policy

**Implement:** change user-facing/project documentation naming from ERPQ to ERPQu. Keep database identifiers, crate names and public API namespaces unchanged unless a separate migration task explicitly changes them.  
**Acceptance:** UI/product docs show ERPQu; no breaking schema/package rename is bundled with branding.

### QGOV-003 — Reproducible Rust build

**Implement:** pin lockfile behavior, normalize workspace membership and remove/deprecate stale root source paths from the active build picture. Establish `cargo fmt`, `cargo check --locked`, clippy and tests as baseline commands.  
**Acceptance:** a clean checkout can execute the documented Rust build/test path using the lockfile.

### QGOV-004 — Reproducible web/mobile installs

**Implement:** reconcile `package.json` and lockfile mismatches (including previously observed `@dnd-kit` drift), document supported Node/runtime versions and ensure clean install scripts are deterministic.  
**Acceptance:** clean `npm ci` for each JS client succeeds without manual lockfile edits.

### QGOV-005 — Migration taxonomy

**Implement:** separate schema migrations, safe system fixtures and demo/sample data. Remove password-reset or demo-user behavior from production migration paths.  
**Acceptance:** empty production bootstrap produces schema + required system reference data only; demo bootstrap is an explicit separate command/profile.

### QGOV-006 — CI foundation

**Implement:** PR pipeline for formatting, check/clippy, unit/integration tests, frontend lint/typecheck/test, migration smoke tests and build. Deployment must require CI success.  
**Acceptance:** intentionally failing a representative Rust, frontend and migration check blocks the PR pipeline.

### QGOV-007 — Architecture decision records

Create ADRs for: modular monolith; hybrid typed/metadata model; DB/site-per-tenant target; Decimal policy; immutable ledgers; transactional outbox; compiled-in Rust App v1; API versioning approach.  
**Acceptance:** later tasks can link to a stable architectural decision instead of re-deciding fundamentals.

### Phase 0 exit gate

- Fresh clone installs/builds deterministically.
- Production migrations contain no demo/password side effect.
- CI runs on every PR and blocks obvious failures.
- ERPQu naming is visible without risky internal mass-renaming.
- Current HEAD delta from `5d55165` is documented.

---

## 7. Phase 1 — P0 security containment

**Purpose:** eliminate known privilege escalation, data leakage and production-secret risks before deeper refactoring.

### QSEC-001 — Route and authorization inventory

Inventory every route as Public, Authenticated or Permission-guarded. Introduce an `AuthorizationEngine` contract of the form `authorize(actor, action, resource_type, resource_id, context)`. Policies default to DENY.  
**Acceptance:** every registered route has an explicit security classification; an unclassified protected resource fails closed.

### QSEC-002 — Role mutation privilege escalation fix

Protect role assign/remove operations with a privileged permission such as `security.role.manage`; prevent self-escalation; audit actor, target, old roles and new roles.  
**Regression tests:** normal user cannot grant/remove roles; authorized admin can; self-escalation fails; cross-tenant target fails.

### QSEC-003 — Production registration policy

Make public registration an explicit environment/product setting, default disabled for production. If self-signup is later enabled, it creates only a minimally privileged identity and follows verification/invitation policy.  
**Acceptance:** production configuration exposes no unrestricted account-creation path.

### QSEC-004 — Approval transition authorization

Fix approve/reject/delegate so only the current eligible actor/role may transition the request. Enforce scope, current state, version and delegation rules in the service layer.  
**Regression tests:** arbitrary rejection, unauthorized delegation, double approval and stale-version transitions fail.

### QSEC-005 — Authenticated WebSocket handshake

Require authentication before subscription. Bind each connection to user/session/tenant context; authorize channels; remove anonymous access to user notifications.  
**Acceptance:** anonymous connection is rejected; User A cannot subscribe to User B; global channels carry only explicitly public/non-sensitive events.

### QSEC-006 — Private file service

Replace public `ServeDir` semantics for sensitive uploads with a File entity containing storage key, owner, tenant/company/entity linkage, MIME, size, checksum and visibility. Downloads pass through authz. Production storage should be private S3-compatible/object storage or equivalent private backend.  
**Acceptance:** anonymous and unauthorized file fetches fail even when the storage key is known; authorized entity reader can download.

### QSEC-007 — Remove/debug-gate public operational endpoints

Remove or strictly development-gate test-email and other diagnostic routes. Inventory health/metrics endpoints separately so sensitive diagnostics require network or auth controls.  
**Acceptance:** production route snapshot contains no test/debug mutation endpoint.

### QSEC-008 — Session/token redesign

Introduce short-lived access credentials plus refresh rotation or server-side sessions, revocation and JTI/session tracking. Invalidate relevant sessions after password/role/security changes. Web tokens use HttpOnly + Secure + SameSite cookies where architecture permits; mobile uses secure OS storage.  
**Acceptance:** removing a privileged role prevents continued privileged API use without waiting for a 24-hour JWT to expire.

### QSEC-009 — Login and privileged-account hardening

Implement purpose-specific throttling, lockout/backoff policy, security event audit and optional/required 2FA policy for privileged roles.  
**Acceptance:** brute-force controls are measurable and tested; privileged authentication events are auditable.

### QSEC-010 — Secret/configuration hygiene

Stop tracking `.env`; create safe `.env.example`; remove DB URL/token logging; fail production startup when required secrets are absent; audit history and rotate credentials that were ever real. Add secret scanning to CI.  
**Acceptance:** a repository scan finds no active secret material; logs do not expose database credentials or tokens.

### QSEC-011 — PostgreSQL production authentication

Remove `trust` authentication from production paths; restrict network exposure; use SCRAM authentication and a non-superuser application role; separate migration privilege where appropriate; use TLS for remote DB connections.  
**Acceptance:** application connects with least-privilege credentials; unauthenticated network clients cannot connect.

### QSEC-012 — Security regression suite

Build an integration test suite for role escalation, approval abuse, tenant access, WebSocket subscription, file access, debug endpoints, revoked sessions and common IDOR cases.  
**Acceptance:** each P0 finding from the original audit has a test that fails on the vulnerable behavior and passes after the fix.

### Phase 1 exit gate

- No authenticated normal user can assign privileged roles.
- Approval reject/delegate is authorization-safe.
- WebSocket and attachments enforce identity and document scope.
- Production registration/debug endpoints are controlled.
- Secret/config/database authentication issues are remediated.
- P0 regression suite is mandatory in CI.

---

## 8. Phase 2 — Tenant, Company and organizational context

**Purpose:** make data ownership explicit before rebuilding ledgers and transaction graphs.

### QTEN-001 — Define identity hierarchy

Adopt: **Tenant/Site → Company → Department/Cost Center**. Tenant is the SaaS/isolation boundary; Company is the legal/accounting entity; Department/Cost Center is managerial attribution. Do not reuse one ID for all three concepts.

### QTEN-002 — DB/site-per-tenant target architecture

Use one business database/site per tenant as the target isolation model. A small control plane may later store tenant directory/provisioning metadata, but business data for one tenant remains isolated. Existing `organizations` should be migrated conceptually and gradually; avoid a disruptive table rename solely for terminology.

### QTEN-003 — Request execution context

Create an immutable request context containing authenticated user/session, tenant/site, active company, locale/timezone and correlation ID. Repositories/services may not infer company from arbitrary request payloads.  
**Acceptance:** company-scoped operations reject missing or unauthorized company context.

### QTEN-004 — Company master

Create/normalize Company with base currency, country, tax identity extension points, default accounts, fiscal configuration and status. Ensure one tenant can have multiple companies.

### QTEN-005 — Cost center/department dimensions

Define hierarchical cost centers and departments independently. Accounting postings may carry cost center/project dimensions without confusing them with data isolation.

### QTEN-006 — Scope existing business tables

Inventory all business tables. Add required `company_id` where ownership is legal-entity-specific. For DB-per-tenant, use tenant context at connection/site level; use explicit tenant identifiers only where cross-tenant control-plane data exists.  
**Migration:** additive nullable column → deterministic backfill → integrity check → FK/index → NOT NULL where appropriate.

### QTEN-007 — Repository scope enforcement

Eliminate unscoped repository methods for company-owned data. Repository interfaces accept execution/company context and always constrain reads/writes.  
**Acceptance:** code review/search finds no business repository path that can fetch another company by omission of scope unless explicitly privileged.

### QTEN-008 — Cross-company rules

Define which masters may be shared within a tenant and which are company-owned. Inter-company transfer/sale must be explicit documents, never silent cross-company stock or GL writes.

### QTEN-009 — Isolation tests

Generate Tenant A/B and Company A1/A2 fixtures and verify API, search, reports, files, jobs and notifications cannot cross isolation boundaries.  
**Acceptance:** tenant-isolation suite is mandatory in CI.

### Phase 2 exit gate

- Tenant/Site, Company and organizational dimensions are unambiguous.
- Every new finance/stock document has explicit company ownership.
- Existing company-owned data is backfilled and constrained.
- Isolation tests cover repositories and APIs, not only UI filters.

---

## 9. Phase 3 — Document & transaction kernel

**Purpose:** create universal mechanics that every ERP transaction can trust.

### QKRN-001 — Standard Document identity

Define common document metadata: `id`, `company_id` where applicable, owner, created/updated actor/timestamp, `doc_status`, `version`, naming/number, amendment linkage and cancellation metadata. Prefer shared traits/contracts rather than forcing every typed domain into one physical table.

### QKRN-002 — Universal lifecycle

Implement Draft → Submitted/Posted → Cancelled → Amended semantics. Draft may be edited/deleted subject to permissions; Submitted may not be arbitrarily mutated or deleted; Cancel creates reversal effects; Amend creates a new document linked to the cancelled source.  
**Acceptance:** lifecycle state machine rejects invalid transitions centrally.

### QKRN-003 — Optimistic concurrency

Use document version/etag semantics for mutable drafts and workflow transitions. A stale writer receives a conflict instead of overwriting newer state.

### QKRN-004 — Decimal migration policy

Replace `f64` for money, debit, credit, tax, discount, exchange rate and valuation amounts with `rust_decimal::Decimal` end-to-end. Define database precision/scale per concept and API serialization rules.  
**Acceptance:** static search and type-level checks leave no financial amount path using binary floating point.

### QKRN-005 — UnitOfWork

Introduce a transaction abstraction backed by one `sqlx::Transaction`. A business service can persist document header, lines, ledger effects, audit and outbox records inside the same transaction.

### QKRN-006 — PostingContext and idempotency

Every submit/post action carries actor, company, posting datetime, source document, correlation ID and idempotency key. Enforce uniqueness for operations that must not post twice.  
**Acceptance:** retrying the same submit request cannot create duplicate ledgers.

### QKRN-007 — Persist all transaction line items

Audit Sales/Purchase quote/order/shipment/invoice/bill and other child tables. Make header + lines persistence atomic; enforce line-to-header FK and deterministic line ordering/identity.  
**Acceptance:** calculated totals can be reconstructed from persisted source lines.

### QKRN-008 — Source traceability

Standardize `source_type`, `source_id`, `source_line_id`/voucher references for derived transactions. Preserve graph links through submit, cancel, return and amend.

### QKRN-009 — Append-only audit record

Record actor, action, document identity, version/state changes and reason. Prevent ordinary application roles from updating/deleting audit history.

### QKRN-010 — Concurrency-safe naming series

Create a sequence/naming service scoped by entity/company/series. Use database atomicity so concurrent document creation cannot duplicate numbers.

### QKRN-011 — Transactional outbox base

Create outbox rows in the same transaction as state changes. Delivery state includes pending, processing, completed, failed/retry and dead-letter metadata. The outbox is for async side effects; it does not replace synchronous GL/stock posting required for consistency.

### QKRN-012 — Database invariants

Add foreign keys, unique constraints, check constraints and indexes for lifecycle/status/source/idempotency relationships where the database can safely enforce them. Use triggers sparingly for immutability only where they clearly reduce bypass risk.

### QKRN-013 — Safe migration playbook

For live data use: add schema → backfill in bounded batches → compare/reconcile → enable new writes → enforce constraints → later remove legacy columns. Every destructive cleanup receives its own later task and backup/restore checkpoint.

### QKRN-014 — Kernel invariant test suite

Cover invalid lifecycle transitions, stale version writes, duplicate submit, failed mid-transaction rollback, missing line items, audit creation and outbox atomicity.

### Phase 3 exit gate

- Submitted documents cannot be edited/deleted through supported service/API paths.
- Failed posting rolls back source + ledger + audit together.
- Duplicate submit is idempotent/rejected.
- Financial values use Decimal.
- Transaction lines are durable and traceable.

---

## 10. Phase 4 — Trusted accounting kernel

**Purpose:** make Finance a ledger system rather than a collection of finance screens.

### QACC-001 — Chart of Accounts integrity

Normalize account tree, account type/root type, currency, company scope, active/frozen state and required control accounts. Prevent postings to group/non-postable accounts.

### QACC-002 — Fiscal year and accounting periods

Define fiscal years/periods, open/closed state and posting-date validation. Provide privileged period-close/reopen procedures with audit.

### QACC-003 — Immutable GL Entry model

Implement append-only GL rows containing company, posting date/time, account, party, cost center/project, currencies, exchange rate, debit/credit base and account currency, voucher/source IDs, cancellation/reversal linkage and creation metadata.

### QACC-004 — Accounting Posting Engine

Accept typed posting instructions and validate: company, period, accounts, currencies and `Σ debit == Σ credit`. Persist GL entries atomically through the UnitOfWork. Modules never insert GL rows directly.

### QACC-005 — Journal Entry lifecycle

Journal Draft has zero GL effect. Submit produces balanced GL exactly once. Cancel produces exact reversing entries and marks source cancellation state; it never deletes historical GL.

### QACC-006 — Fix GL and Trial Balance queries

Make reports read valid immutable GL effects, not draft journal lines or mutable source documents. Create indexes for company/account/posting date/voucher access paths.

### QACC-007 — Source-document posting adapters

Define posting adapters for Sales Invoice, Purchase Invoice/Bill, Expense and Asset transactions. Each adapter returns posting instructions; the central engine validates and writes them.

### QACC-008 — Accounts Receivable/Payable model

Model party ledger references and outstanding amounts from submitted invoices and allocations. Avoid a mutable “outstanding” field as sole truth; it must be reconcilable from ledger/allocation records.

### QACC-009 — Payment Entry

Create first-class Payment Entry with party, bank/cash account, currency/exchange rate, references/allocations, advances and unallocated amount. Support partial and multi-invoice allocation.

### QACC-010 — Credit/debit notes and write-off

Implement return/adjustment documents with traceable source references and correct reversal/adjustment posting. Write-off requires explicit permission, account and reason.

### QACC-011 — Multi-currency

Store document currency, account currency and company base currency explicitly. Define rate precision, rate source interface and realized exchange gain/loss behavior.

### QACC-012 — Tax posting contract

Create tax lines/components that can be produced by localized tax engines later. Do not hardcode Indonesia-specific tax regulations into accounting core.

### QACC-013 — Bank reconciliation

Model bank statement lines/import, matching, reconciliation status and audit trail. Reconciliation must not rewrite historical voucher amounts.

### QACC-014 — Financial reports

Implement/rebuild General Ledger, Trial Balance, Balance Sheet, Profit & Loss and Cash Flow from the trusted ledger and fiscal/company dimensions.

### QACC-015 — Accounting migration & reconciliation

Before switching reads, generate old-vs-new trial balances by company/account/date. Any mismatch requires an explained reconciliation record; do not silently “fix” history.

### QACC-016 — Accounting invariant tests

Must include: draft never affects GL; debit=credit; posted immutable; cancel exact reversal; duplicate submit impossible; failed posting full rollback; closed period rejection; source/voucher traceability; partial payment/outstanding; multi-currency rounding rules.

### Phase 4 exit gate

- Trial Balance is sourced only from valid GL effects.
- Every voucher is balanced and traceable.
- Submitted/cancelled semantics are immutable and reversible.
- Payments and outstanding AR/AP reconcile.
- Historical migration reconciliation is signed off before legacy finance paths are removed.

---

## 11. Phase 5 — Trusted stock kernel

**Purpose:** make Stock Ledger the quantity/value history and remove lost-update risk.

### QSTK-001 — Item master vs inventory state

Separate product/item master attributes from warehouse-specific state. Item does not own one global mutable quantity.

### QSTK-002 — Warehouse model

Create company-scoped hierarchical Warehouse with enabled/frozen status and optional warehouse type/location attributes.

### QSTK-003 — Bin projection

Create `(company, warehouse, item)` Bin for current/projection values: actual, reserved, available, ordered/planned and stock value as needed. Bin is rebuildable from ledger/reservation sources.

### QSTK-004 — Immutable Stock Ledger Entry

Store item, warehouse, posting datetime, actual quantity delta, quantity after, valuation rate, stock value difference/after, source type/id/line, company and optional batch/serial identifiers.

### QSTK-005 — Stock Posting Engine

All receipt/issue/transfer/reconciliation instructions flow through one engine in a DB transaction. Use deterministic locking/ordering for affected bins to prevent lost updates and deadlocks.

### QSTK-006 — Negative stock policy

Define company/item/warehouse policy. Enforcement is performed at posting time under lock, not by a stale pre-check.

### QSTK-007 — Valuation v1

Implement Moving Average as the first fully tested valuation strategy if it matches current product needs; expose a strategy interface so FIFO can be added without changing source documents. Decimal only.

### QSTK-008 — Stock documents

Implement/normalize Receipt, Issue, Transfer and Stock Reconciliation documents using universal lifecycle and posting engine.

### QSTK-009 — Transfer atomicity

Source issue and destination receipt occur in one transaction and share a transfer/voucher identity. Partial commit is impossible.

### QSTK-010 — Reservation

Create explicit reservation records linked to Sales Orders/other demand; derive available quantity from actual minus valid reservations.

### QSTK-011 — Serial number and batch

Introduce lifecycle and traceability for serialized/batched items. Enforce quantity rules and prevent duplicate active serial ownership.

### QSTK-012 — Inventory accounting bridge

For perpetual inventory, Stock Posting produces accounting instructions for inventory, COGS/expense and adjustments within the same UnitOfWork where business validity depends on both ledgers.

### QSTK-013 — Landed cost

Model additional acquisition costs and allocation to eligible receipts/items with traceable valuation adjustment.

### QSTK-014 — Repost/revaluation framework

Provide a controlled, audited revaluation/repost job for backdated changes where supported. Never silently mutate old ledger rows; create controlled adjustment/recomputed projections according to chosen valuation design.

### QSTK-015 — Stock migration/rebuild

Generate opening balances from existing reliable history/snapshot with explicit cutover date. Rebuild Bin projections and reconcile old current quantity/value to the new ledger.

### QSTK-016 — Stock invariant/concurrency tests

Test 100 concurrent movements on the same item/bin; transfer atomicity; no lost update; ledger quantity equals Bin; valuation math; serial/batch uniqueness; negative-stock enforcement; failure rollback; inventory GL reconciliation.

### Phase 5 exit gate

- Stock Ledger is authoritative and Bin is rebuildable.
- Concurrent updates do not lose quantity.
- Transfers cannot half-commit.
- Inventory valuation reconciles with inventory GL for perpetual-inventory companies.

---

## 12. Phase 6 — Selling & Buying as document graphs

**Purpose:** connect commercial documents to Stock, Accounting and Payment without duplicate/side effects.

### QSELL-001 — Customer and commercial master cleanup

Normalize Customer, addresses/contacts, credit controls, currencies, tax/pricing extension points and company visibility.

### QSELL-002 — Sales document graph

Implement/normalize Quotation → Sales Order → Delivery/Shipment → Sales Invoice → Payment with source-line references and quantities/amounts billed/delivered derived from child relationships.

### QSELL-003 — Partial fulfillment/invoicing/payment

Support partial delivery, partial billing and partial payment without mutating historical quantities. Remaining quantities are calculated from submitted linked documents.

### QSELL-004 — Returns and credit notes

Return references original delivery/invoice lines, reverses stock/GL as applicable and cannot exceed eligible quantity/value.

### QSELL-005 — Pricing, discounts and tax composition

Create deterministic pricing calculation with persisted line-level price/discount/tax inputs and outputs. Never store only header grand total.

### QSELL-006 — Credit and reservation controls

Integrate Sales Order reservations and optional credit-limit policy at submit/fulfillment boundaries.

### QBUY-001 — Supplier and purchasing master cleanup

Normalize Supplier, addresses/contacts, currencies, tax/payment terms and company visibility.

### QBUY-002 — Buying document graph

Implement Material Request → RFQ → Supplier Quotation → Purchase Order → Purchase Receipt → Purchase Invoice → Payment with source-line references.

### QBUY-003 — Partial receipt/billing/payment

Allow partial quantities and values while preserving outstanding ordered/received/billed states from document relationships.

### QBUY-004 — Returns and debit notes

Trace return to receipt/invoice and perform correct stock/accounting reversal without deleting history.

### QBUY-005 — Three-way matching controls

Support optional PO–Receipt–Invoice matching tolerances and exceptions. Approval is required for configured mismatches.

### QBUY-006 — Landed-cost integration

Eligible freight/duty/additional costs can be allocated to receipts through the Stock landed-cost mechanism rather than ad-hoc average-cost edits.

### QCOM-001 — End-to-end commercial transaction tests

Test at least: order → partial delivery → invoice → partial payment; purchase order → partial receipt → invoice → payment; sales/purchase return; taxes/discounts; cancellation; retry/idempotency; GL/stock/source graph reconciliation.

### Phase 6 exit gate

- Every commercial header total is reconstructable from persisted lines.
- Partial and return flows are traceable to source lines.
- Stock and GL effects occur through central posting engines.
- Invoice/payment/outstanding and delivery/stock quantities reconcile end-to-end.

---

## 13. Phase 7 — Asset/EAM remediation and integration

**Purpose:** preserve ERPQu's strongest differentiator while making it obey ERP-grade invariants.

### QAST-001 — Asset Category accounting configuration

Configure Fixed Asset, Accumulated Depreciation, Depreciation Expense, Gain/Loss Disposal and Capital WIP accounts by category/company. Remove generated/random account IDs.

### QAST-002 — Asset capitalization

Create traceable capitalization/acquisition path from purchase/receipt or opening asset, with controlled accounting effect.

### QAST-003 — Depreciation schedule and posting

Separate calculated schedule from posted depreciation. Posting uses Accounting Posting Engine, period rules and idempotency. Recalculation cannot silently rewrite posted journals.

### QAST-004 — Sale/disposal atomicity

Asset status may become Sold/Disposed only if the required accounting posting succeeds in the same UnitOfWork. Failure leaves the business state unchanged.

### QAST-005 — Asset transfer and location/custodian history

Maintain append-only assignment/location history and permission checks; do not overwrite the only record of prior custody.

### QAST-006 — Maintenance terminology boundary

Reserve clear names: `Maintenance Order`/`Maintenance Work Order` for EAM; later manufacturing uses `Manufacturing Order`/`Production Order` instead of colliding on generic `Work Order` semantics.

### QAST-007 — Maintenance spare-parts integration

Parts consumed by maintenance create Stock instructions; costs may feed maintenance/asset expense posting according to accounting configuration.

### QAST-008 — Fuel/operational expense integration

Critical operational completion that requires accounting uses synchronous posting or a durable, idempotent posting command. In-memory broadcast must never be the only trigger for required GL.

### QAST-009 — Asset/EAM regression suite

Test depreciation idempotency, closed period, disposal gain/loss, failed posting rollback, part consumption, asset history and permissions.

### Phase 7 exit gate

- No asset can be Sold/Disposed with missing required accounting.
- Depreciation cannot duplicate on retries or clustered workers.
- Maintenance part consumption reconciles to Stock.
- Asset accounting configuration is explicit and company-scoped.

---

## 14. Phase 8 — Workflow, jobs, events, files and notifications as platform services

**Purpose:** turn promising foundations into reusable, durable kernel capabilities.

### QWFL-001 — Normalized workflow metadata

Replace `level_1 ... level_5` architecture with WorkflowDefinition, WorkflowState and WorkflowTransition. A transition defines from/to state, action, required permission/role and optional condition.

### QWFL-002 — Entity registry integration

Remove hard-coded `VALID_ENTITY_TYPES`; resolve workflow eligibility through registered document/entity metadata.

### QWFL-003 — Workflow authorization and versioning

Apply AuthorizationEngine + optimistic concurrency to transitions. Delegation records origin, delegate, expiry and scope.

### QWFL-004 — Workflow/document lifecycle contract

Define which workflow terminal transition invokes document Submit/Cancel and ensure business posting occurs only after successful authorization inside the required transaction boundary.

### QJOB-001 — Persistent job table/queue

Model job identity, tenant/site, type, payload reference, schedule, attempt, state, lease/lock, last error and execution history.

### QJOB-002 — Cluster-safe worker and scheduler

Use distributed/database locking and idempotency so three API/worker replicas do not execute the same depreciation or periodic task three times.

### QJOB-003 — Retry/backoff/DLQ/admin visibility

Failed jobs use bounded retries/backoff and dead-letter state. Provide operator tools to inspect/retry with audit.

### QEVT-001 — Transactional outbox dispatcher

Dispatch committed outbox events to notification, webhook and integration handlers. Delivery is idempotent and observable.

### QNTF-001 — Notification routing

Route by user/role/document scope and tenant/site. WebSocket uses `send_to_user`/authorized channel semantics; global broadcast is explicit only.

### QFIL-001 — Complete document-aware file lifecycle

Add retention/delete/virus-scan extension points, signed/private storage access where suitable, checksums and orphan cleanup jobs without bypassing authorization.

### QWHK-001 — Webhook engine

Create signed, retryable, idempotent webhooks from outbox events with per-endpoint secrets, delivery logs and tenant scope.

### Phase 8 exit gate

- Workflow depth is metadata-driven, not capped at five levels.
- Scheduled jobs are cluster-safe and inspectable.
- Async side effects survive process crashes.
- Notifications/files/webhooks respect authorization and tenant scope.

---

## 15. Phase 9 — ERPQu Metadata Kernel

**Purpose:** transition ERPQu from a collection of manually coded modules toward an extensible platform without sacrificing typed Rust invariants.

### QMETA-001 — EntityType registry

Define entity/document name, app owner, storage strategy, lifecycle capability, permissions, naming, searchability and child relations.

### QMETA-002 — FieldDefinition

Support field name/label/type, required, unique, read-only, default, precision, options, relation, permission level, search/list behavior and validation metadata.

### QMETA-003 — LayoutDefinition

Define sections, tabs, columns, child grids, list columns, quick filters and form order independently from core business logic.

### QMETA-004 — Hybrid storage model

Use normal typed tables/columns for ERP core fields. Permit `custom_data JSONB` for non-invariant extension fields on standard typed documents. User-defined generic entities may use a dedicated dynamic-document JSONB store with metadata validation and targeted indexes. Do **not** convert finance/stock/assets into EAV.

### QMETA-005 — Custom fields and property overrides

Allow tenant/site customization of labels, visibility, required/read-only behavior and custom fields within guarded constraints. Core invariant fields cannot be disabled or type-mutated unsafely.

### QMETA-006 — Metadata validation/versioning

Every metadata change is versioned, audited and validated against existing data. Breaking type/removal changes require a migration plan.

### QMETA-007 — Generic CRUD service for eligible entities

Generate validation, permission checks, audit, naming and CRUD for metadata-enabled generic entities. Typed ERP documents may expose generic read/layout behaviors while retaining typed command services for submit/post operations.

### QMETA-008 — Generic list/search

Standardize pagination, filters, sorting, full-text/search fields, company scope and permission filtering. Prevent arbitrary SQL expressions from client metadata.

### QMETA-009 — Web form renderer

React admin consumes Layout/Field metadata for generic forms, child grids, validation messages, permission/read-only state and list views. Do not replace hand-crafted complex screens until parity is proven.

### QMETA-010 — Mobile metadata subset

Define a safe subset for mobile/field forms and offline-capable read workflows. Do not force every desktop layout onto mobile.

### QMETA-011 — Metadata permission levels

AuthorizationEngine evaluates entity/action plus optional field permission level. Hidden/read-only UI state mirrors but never replaces API enforcement.

### QMETA-012 — Sample custom entity proof

Build a non-critical sample entity solely from metadata with form, list, permissions, workflow, audit and API.  
**Acceptance:** no hand-written route/service/form is required for ordinary CRUD.

### Phase 9 exit gate

- Standard typed entities remain type-safe.
- A generic custom entity works end-to-end through metadata.
- Custom fields do not weaken accounting/stock invariants.
- Metadata changes are versioned and permissioned.

---

## 16. Phase 10 — Reporting, print and API platform

### QRPT-001 — ReportDefinition

Create report metadata for fields, filters, grouping, totals, permission scope and data source. Begin with safe registered query providers rather than user-supplied arbitrary SQL.

### QRPT-002 — Generic list/export reporting

Support permission-aware CSV/XLSX-style export interfaces and asynchronous large export jobs. Apply row/field permissions to exported data.

### QRPT-003 — Financial/stock report providers

Expose typed providers for GL, Trial Balance, financial statements, stock ledger, stock balance and valuation reconciliation.

### QPRT-001 — PrintTemplate

Create server-side print template definitions with document-aware permissions, deterministic rendering and app/localization overrides for invoices, orders, asset forms and reports.

### QAPI-001 — API conventions

Standardize versioning, errors, correlation IDs, pagination, filtering, sorting, dates/timezones, Decimal serialization and idempotency headers.

### QAPI-002 — Generic Entity API

Expose metadata-eligible entity read/list/create/update/delete according to lifecycle and permissions. Submit/cancel remain explicit commands with server-side invariants.

### QAPI-003 — OpenAPI completeness

Generate/document all public API routes and metadata schemas. CI detects undocumented externally exposed routes or stale contract output.

### QAPI-004 — Client generation strategy

Generate typed web/mobile/integration clients where it reduces contract drift. Keep domain-specific commands strongly typed.

### QINT-001 — Integration credentials/scopes

Create service/API credentials with explicit scopes, tenant/company restrictions, rotation and audit instead of reusing human admin JWTs.

### Phase 10 exit gate

- API contract reflects actual public routes.
- Exports/reports respect row/field permission.
- Common entity CRUD and list behavior are generic.
- Print templates and integrations are platform capabilities rather than module-specific hacks.

---

## 17. Phase 11 — ERPQu App System

**Purpose:** create Frappe-like extensibility adapted to Rust instead of copying Python runtime behavior.

### QAPP-001 — App manifest

Define name, version, required kernel version, dependencies, entities, permissions, migrations, fixtures, hooks, jobs and localization assets.

### QAPP-002 — App registry and dependency resolver

At startup/install time validate app versions and dependency graph; reject incompatible combinations before migrations run.

### QAPP-003 — App lifecycle

Implement install → migrate → enable → disable → upgrade → uninstall contracts. Destructive uninstall requires explicit data-retention policy and backup.

### QAPP-004 — Namespaced migrations and fixtures

Each app owns ordered migrations and safe fixtures. Kernel records installed app version and migration history.

### QAPP-005 — Typed hook traits

Define supported hook points such as document validation, after-submit async event, metadata contribution, reports, scheduled jobs and navigation. Hooks cannot bypass central authz or direct-write protected ledgers.

### QAPP-006 — Rust plugin safety model v1

For v1, ERPQu Apps are **compiled into the deployment** as Rust crates plus manifests/metadata. Do not use unstable native dynamic-library ABI loading for untrusted third-party code. A future sandboxed WASM extension model can be evaluated separately.

### QAPP-007 — App CLI/developer tooling

Provide commands to list apps, validate manifests, install/migrate/enable/disable, check compatibility and generate an app skeleton.

### QAPP-008 — Reference sample app

Build a small non-critical sample app using metadata, permissions, workflow, report and hook contracts. Use it as compatibility/e2e proof.

### QAPP-009 — Compatibility matrix and semver policy

Define kernel/app version compatibility, deprecation window and upgrade checks.

### Phase 11 exit gate

- A reference app can be installed/migrated/enabled/disabled safely.
- App hooks cannot bypass central security/ledger rules.
- Compatibility failures are detected before destructive migration.

---

## 18. Phase 12 — Operational ERP expansion

Only begin when Milestone M4 (Platform) is green. Every module must use Kernel lifecycle/authz/workflow/files/jobs and central GL/Stock services where relevant.

### CRM workstream

- **QCRM-001:** Lead, Contact, Organization/Customer prospect model.
- **QCRM-002:** Opportunity/stage/activity pipeline.
- **QCRM-003:** Convert Opportunity to Quotation with source traceability.
- **QCRM-004:** Assignment, tasks, notes/files and permission model.
- **QCRM-005:** Pipeline reports and audit.

### Project workstream

- **QPRJ-001:** Project, task hierarchy, milestones and assignments.
- **QPRJ-002:** Time entries/timesheets and approval.
- **QPRJ-003:** Project cost center/accounting dimensions.
- **QPRJ-004:** Billable time/expense linkage.
- **QPRJ-005:** Project profitability/reporting from trusted ledgers.

### HR workstream

- **QHR-001:** Employee, employment history, department/designation and user mapping.
- **QHR-002:** Leave types, entitlements, requests and workflow.
- **QHR-003:** Attendance/shift foundation.
- **QHR-004:** Expense/advance claims via Accounting/Payment.
- **QHR-005:** Payroll architecture ADR before implementation; payroll must use Decimal, immutable slips/posting and localization adapters.
- **QHR-006:** Payroll only after the ADR and required tax/localization contracts are ready.

### Contract/Rental workstream

- **QCTR-001:** Contract lifecycle, parties, validity, renewals, files and approval.
- **QRNT-001:** Rental contract, rate schedule, asset allocation and availability.
- **QRNT-002:** Rental billing through Selling/Accounting, not separate invoice logic.
- **QRNT-003:** Return/damage/maintenance integration with Assets/EAM.

### Support/helpdesk workstream

- **QSUP-001:** Ticket, priority/SLA, assignment, comments/files.
- **QSUP-002:** Customer/asset linkage and workflow/escalation.
- **QSUP-003:** SLA jobs/notifications use durable scheduler/outbox.

### Phase 12 exit gate

- No operational module owns a shadow GL/stock implementation.
- Every transaction uses shared lifecycle/authorization/audit.
- Cross-module reports reconcile to Accounting/Stock sources of truth.

---

## 19. Phase 13 — Manufacturing, Quality and POS

### Manufacturing

- **QMFG-001:** BOM with versions, effective dates and alternate items.
- **QMFG-002:** Workstation/resource and operation routing.
- **QMFG-003:** Production/Manufacturing Order; avoid ambiguous EAM `Work Order` naming.
- **QMFG-004:** Material reservation and issue through Stock.
- **QMFG-005:** Job Card/operation execution and time capture.
- **QMFG-006:** Finished-goods receipt and WIP accounting through central ledgers.
- **QMFG-007:** Production planning/MRP inputs: demand, on-hand, reservations, open supply, lead time and BOM explosion.
- **QMFG-008:** Scrap/by-product and rework flows.
- **QMFG-009:** Subcontracting using Buying + Stock transfer/receipt contracts.
- **QMFG-010:** Manufacturing cost reconciliation and concurrency tests.

### Quality

- **QQLT-001:** Quality Inspection template/criteria.
- **QQLT-002:** Incoming, in-process and outgoing inspections linked to Purchase/Manufacturing/Sales.
- **QQLT-003:** Non-conformance and corrective-action workflow.
- **QQLT-004:** Hold/release rules integrated with Stock status where required.

### POS

- **QPOS-001:** POS profile/register, cashier permissions and warehouse/company scope.
- **QPOS-002:** Fast sale/payment integrated with Selling/Stock/GL engines.
- **QPOS-003:** Shift/open-close cash reconciliation.
- **QPOS-004:** Returns/voids use normal reversal semantics.
- **QPOS-005:** Offline architecture only after conflict/idempotency design is proven; never invent client-side ledger truth.

### Phase 13 exit gate

- Manufacturing stock/WIP/GL reconcile.
- Quality holds cannot be bypassed by ordinary fulfillment paths where policy applies.
- POS sales are simply high-throughput trusted ERP transactions, not a separate ledger.

---

## 20. Phase 14 — Indonesia Localization App

Create `erpqu-indonesia` as an App, not hardcoded core behavior. Regulatory values must be configuration/versioned rules, never timeless constants.

- **QIDN-001:** Localization manifest, Indonesian company identity fields (e.g. tax/person identifiers) as governed extensions.
- **QIDN-002:** Indonesian Chart of Accounts templates/fixtures.
- **QIDN-003:** PPN/VAT rule adapter and tax invoice metadata.
- **QIDN-004:** Withholding/PPh rule adapters and certificates.
- **QIDN-005:** Local invoice/print templates.
- **QIDN-006:** Tax reporting/export interfaces.
- **QIDN-007:** Coretax/DJP integration behind versioned adapter/service credentials; exact external requirements must be revalidated against then-current official rules before implementation.
- **QIDN-008:** Regulatory effective-date/version migration tests so historical documents retain the rules that applied when posted.

### Phase 14 exit gate

- Core Accounting remains country-neutral.
- Historical transactions retain their applicable localization rule version.
- External regulatory adapters are replaceable/versioned and do not leak credentials.

---

## 21. Phase 15 — Production engineering, cloud and governance

### QSRE-001 — Environment topology

Define dev/test/staging/prod, private DB/network boundaries, object storage, Redis/queue, worker processes and secret injection. Avoid production-only behavior that cannot be exercised in staging.

### QSRE-002 — Observability

Structured logs with correlation/tenant/company context but no secrets; metrics for API latency/error, DB pool, job queue, outbox lag, WebSocket counts, posting failures and reconciliation alerts; distributed tracing where useful.

### QSRE-003 — SLOs and alerting

Define availability/latency targets, durable-job delay targets, backup objectives and accounting/stock reconciliation alerts. Alert on invariant risk, not only CPU.

### QSRE-004 — Backup/PITR

Automated database backups/PITR where supported, object-storage backup/versioning and encrypted retention. Backups are useless until restore is tested.

### QSRE-005 — Restore drills

Automate tenant/site restoration into isolated staging; periodically prove database + files + app versions can be restored together.

### QSRE-006 — Release pipeline

PR checks → immutable image → vulnerability scan/SBOM → staging migration → smoke/integration/UAT → production approval → monitored rollout. Deploy by image digest/SHA, not mutable `latest` alone.

### QSRE-007 — Upgrade preflight

Before production migration: supported source version, free space, backup checkpoint, app compatibility, migration dry run, reconciliation baseline and rollback/recovery plan.

### QSRE-008 — Tenant/site provisioning

Create control-plane workflow to provision database/site, secrets, storage namespace, initial admin and installed app set. Avoid one shared super-admin credential across sites.

### QSRE-009 — Performance/load suite

Benchmark critical paths: login/authz, list/search, invoice submit, stock posting, report generation and 100+ concurrent movements. Establish regression thresholds.

### QSRE-010 — Security supply chain

Secret scanning, dependency audit, SAST, container scanning, SBOM, signed/attested release artifacts where practical and documented patch process.

### QGOV-008 — Repository governance

Create/update README, LICENSE decision, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, CHANGELOG/release notes and support/deprecation policy before inviting broad external contribution.

### QGOV-009 — Developer documentation

Document architecture, app SDK, metadata schema, lifecycle, authorization, posting engines, migrations, testing, API and release/upgrade rules.

### Phase 15 exit gate

- Restore drill succeeds with reconciled data.
- Production release is reproducible and gated.
- Security/observability cover business invariants as well as infrastructure.
- Tenant provisioning and upgrades are scripted, version-aware and auditable.

---

## 22. Phase 16 — ERPQu 1.0 release gate

ERPQu 1.0 should be a **trust milestone**, not “all possible modules complete.” The release candidate must satisfy these checks on production-like data.

### QREL-001 — Golden invariant suite

Required green checks:

1. Draft journal never changes Trial Balance.
2. Submitted/posted document cannot be edited or deleted.
3. Cancel creates exact reversal and history remains traceable.
4. Source document + required GL/Stock effects commit atomically.
5. Every sales/purchase invoice amount is reconstructable from persisted lines.
6. Debit equals credit for every accounting voucher.
7. Duplicate submit/business event cannot post twice.
8. 100 concurrent stock movements have no lost quantity.
9. Stock Ledger equals Bin balances.
10. Inventory valuation reconciles to relevant inventory GL accounts.
11. A normal user cannot grant themselves privilege.
12. A user cannot approve/reject/delegate outside current workflow authority.
13. Tenant/Site A cannot read Site B; Company A cannot access Company B except explicit authorized cross-company operations.
14. Private attachments cannot be fetched anonymously or by unrelated users.
15. Notifications reach only authorized users/channels.
16. Revoked privileged access becomes ineffective promptly.
17. Fresh checkout has reproducible builds.
18. Upgrade migrations preserve accounting/stock history and reconcile before/after.
19. Backup + file store can be restored into a usable site.
20. Critical async jobs survive process crash/retry without duplicate business effect.

### QREL-002 — Migration rehearsal

Rehearse upgrade from the oldest supported ERPQu production schema with realistic data volume. Record duration, locks, backfill behavior and reconciliation output.

### QREL-003 — Business UAT

Run scripted UAT by roles: System Admin, Finance, Warehouse, Sales, Purchasing, Asset/Maintenance, Approver and Auditor. Test denial paths as well as happy paths.

### QREL-004 — Security review

Re-run route/permission matrix, tenant isolation, file/WebSocket/session abuse tests and dependency/secret scans. Resolve P0/P1 security findings before release.

### QREL-005 — Operational readiness

On-call/support ownership, incident runbook, backup/restore runbook, migration recovery, audit export, monitoring dashboards and escalation contacts are documented.

### QREL-006 — Cutover and stabilization

Use staged rollout, monitor reconciliations and error budgets, freeze risky feature changes during stabilization, and record post-release issues as versioned backlog rather than hot-fixing without tests.

---

## 23. Data migration strategy across the program

For every legacy-to-kernel transition, follow this sequence:

1. **Inventory** existing rows, nulls, duplicates, broken FKs and orphan children.
2. **Add** new schema without destroying old data.
3. **Backfill** deterministically; store migration version/cutover markers.
4. **Reconcile** counts, sums and business invariants.
5. **Shadow-read or compare** old/new behavior where practical.
6. **Switch writes** to the new service/ledger.
7. **Switch reads** only after reconciliation is green.
8. **Enforce** NOT NULL/FK/unique/check constraints after data is valid.
9. **Observe** for at least one release cycle appropriate to risk.
10. **Remove** legacy columns/tables only in a separate cleanup migration after a verified backup.

Special care is required for Finance and Stock: never manufacture historical detail that did not exist. If legacy data cannot reconstruct line-level/ledger-level truth, create an explicit **opening balance/cutover document** with source provenance rather than pretending it is original history.

---

## 24. Test architecture

### Domain/unit tests

- lifecycle state machines;
- authorization policy decisions;
- Decimal/tax/pricing calculations;
- debit/credit balancing;
- stock valuation strategies;
- workflow conditions;
- naming/idempotency logic.

### PostgreSQL integration tests

- UnitOfWork rollback;
- FK/unique/check constraints;
- concurrent row locking;
- ledger posting;
- migration from previous schema;
- tenant/company repository scope.

### API/security tests

- public/protected route matrix;
- IDOR/cross-company/cross-tenant denial;
- role escalation;
- approval abuse;
- file access;
- session revocation;
- WebSocket channel authorization;
- idempotency and stale version conflicts.

### End-to-end business tests

- Sales: order → delivery → invoice → payment → return.
- Buying: PO → receipt → invoice → payment → return.
- Assets: capitalization → depreciation → transfer → disposal.
- Maintenance: order → parts → completion → cost/accounting.
- Later Manufacturing: demand → materials → WIP → finished goods → cost.

### Property/concurrency tests

Use generated cases where valuable for balancing/valuation; repeatedly test concurrent stock and sequence operations. The aim is to prove invariants under retries and contention, not just happy-path examples.

### UI tests

Prioritize critical workflows, field permission/read-only state, error/conflict handling and submit/cancel confirmations. UI tests do not replace API/domain tests.

---

## 25. CI/CD quality gates by milestone

### Starting at M0

- format/check/clippy;
- unit tests;
- deterministic JS install/lint/typecheck;
- migration smoke test.

### Starting at M1

- PostgreSQL/Redis integration environment;
- security regression suite;
- tenant/company isolation suite;
- lifecycle/idempotency tests.

### Starting at M2

- accounting invariant suite;
- stock concurrency/reconciliation suite;
- end-to-end selling/buying tests;
- old/new migration reconciliation fixtures.

### Starting at M4

- metadata schema compatibility tests;
- generic API contract/OpenAPI diff;
- sample App compatibility/install/migrate tests.

### Starting at M6

- container/SBOM/security scans;
- staging migration rehearsal;
- load smoke thresholds;
- backup/restore test job;
- release approval and immutable image promotion.

---

## 26. Recommended first execution queue

This is the safest initial order for Antigravity. Do not start Finance/Stock redesign before the preceding containment/context tasks are proven.

1. QGOV-001 — baseline delta audit.
2. QGOV-003 — reproducible Rust build.
3. QGOV-004 — reproducible web/mobile installs.
4. QGOV-005 — migration taxonomy/demo separation.
5. QGOV-006 — CI foundation.
6. QSEC-001 — route/authz inventory and central contract.
7. QSEC-002 — role mutation authorization.
8. QSEC-004 — approval authorization.
9. QSEC-003 — production registration policy.
10. QSEC-005 — WebSocket authentication/subscription.
11. QSEC-006 — private file service.
12. QSEC-007 — remove/gate debug routes.
13. QSEC-010 — secret/config hygiene.
14. QSEC-011 — PostgreSQL production authentication.
15. QSEC-008 — session/revocation redesign.
16. QSEC-009 — login/privileged hardening.
17. QSEC-012 — consolidated security regression suite.
18. QTEN-001/QTEN-002 — tenancy/company ADR and target isolation model.
19. QTEN-003/QTEN-004 — execution context + Company master.
20. QTEN-006/QTEN-007 — scope/backfill business tables and repositories.
21. QTEN-009 — isolation suite.
22. QKRN-001/QKRN-002 — standard document identity/lifecycle.
23. QKRN-004 — Decimal migration.
24. QKRN-005/QKRN-006 — UnitOfWork + idempotent PostingContext.
25. QKRN-007/QKRN-008 — line persistence + source traceability.
26. QKRN-009/QKRN-010 — append-only audit + naming series.
27. QKRN-011/QKRN-012 — transactional outbox + DB invariants.
28. QKRN-014 — kernel invariant suite.
29. QACC-001 onward — Accounting Kernel only after Phase 3 exit gate is green.

Where two IDs are grouped, Antigravity should still keep commits/review boundaries separable if the changes are independently testable.

---

## 27. Antigravity master prompt

Use the following instruction at the start of an implementation session, then append exactly one task ID from this plan.

> You are implementing ERPQu, an ERP/EAM platform in Rust/Axum/PostgreSQL/SQLx with React and React Native clients. The approved architecture is an incremental modular monolith: no rewrite. Treat the attached ERPQu Masterplan & Implementation Plan as the sequencing and invariant authority. First inspect current HEAD and the actual call path/schema/tests; the original audit baseline was commit `5d55165`, so adapt file paths to current HEAD but do not weaken the invariant. Work on exactly the requested TASK ID and its necessary tests/migration; do not add unrelated features or broad refactors. Security is server-side default-deny. Financial values use Decimal. Submitted transactions are immutable; corrections use reversal/cancel/amend. Required GL/Stock effects are atomic in one SQL transaction. Do not write GL/Stock tables outside their posting engines. Respect Tenant/Site and Company scope. Use additive-first migrations and preserve existing data. Before editing, report: (1) current behavior and evidence, (2) implementation plan, (3) files/schema likely affected, (4) tests that will prove acceptance. After editing, run relevant formatting, lint, unit/integration/API/migration tests and report exact results, migration/compatibility impact, remaining risks and next dependent task. Stop rather than silently bypassing a failing invariant or permission boundary.

Then add:

> **TASK:** `<TASK-ID>` — `<task title>`  
> **Acceptance:** use the acceptance criteria and phase gate in the ERPQu Masterplan. Do not start a dependent task automatically after finishing this one.

### Example

> **TASK:** `QSEC-002` — Role mutation privilege escalation fix. Implement only this task and its regression tests. Finish with evidence that a normal user cannot grant/remove roles, an authorized administrator can, self-escalation fails, and cross-tenant targets fail.

---

## 28. Antigravity completion report template

Require Antigravity to end every work package with:

```text
TASK: <ID>
STATUS: DONE | BLOCKED | PARTIAL

Invariant protected:
- ...

Changed:
- files/modules ...
- migrations ...
- API/contracts ...

Evidence:
- command/test: PASS/FAIL
- regression case: PASS/FAIL
- migration check: PASS/FAIL/N/A

Data/compatibility impact:
- ...

Security impact:
- ...

Known remaining risk:
- ...

Next READY task(s):
- ...
```

Do not accept “all done” without the Evidence section.

---

## 29. Backlog status register template

Track implementation outside chat in the repository, for example `docs/implementation/status.md`:

| Task ID | Status | Commit/PR | Evidence | Blocker | Notes |
|---|---|---|---|---|---|
| QGOV-001 | READY |  |  |  |  |
| QSEC-001 | BLOCKED |  |  | QGOV-001/QGOV-006 |  |
| QACC-001 | BLOCKED |  |  | Phase 3 gate |  |

Allowed statuses: `BACKLOG`, `READY`, `IN_PROGRESS`, `BLOCKED`, `DONE`, `DEFERRED`.

---

## 30. Risk register

### R1 — Large refactor breaks working EAM

**Mitigation:** incremental adapters, contract tests, no mass crate move, preserve existing endpoints behind compatible services until replacements are proven.

### R2 — Legacy finance/stock history is internally inconsistent

**Mitigation:** reconcile before migration; use explicit opening/cutover documents when history cannot be reconstructed; never fabricate detail.

### R3 — Tenant/company retrofit creates hidden cross-scope queries

**Mitigation:** repository context, API isolation tests, explicit cross-company documents and DB-per-tenant target.

### R4 — Metadata system weakens Rust type safety

**Mitigation:** typed core tables/services remain authoritative; JSONB only for governed extensions/generic entities; submit/post commands stay typed.

### R5 — AI agent produces broad changes with weak evidence

**Mitigation:** one task ID per work package, mandatory pre-plan, strict DoD, regression tests, completion-report template and phase gates.

### R6 — Async automation duplicates financial effects

**Mitigation:** synchronous required posting, idempotency keys, persistent jobs/outbox, cluster locks and duplicate-post tests.

### R7 — Early advanced-feature pressure

**Mitigation:** functional expansion remains blocked until M2/M4 gates; maintain a backlog but do not implement around missing kernels.

### R8 — Rust app ecosystem ABI/plugin complexity

**Mitigation:** compiled-in App crates for v1; declarative metadata where possible; evaluate WASM later rather than untrusted native dynamic loading.

---

## 31. What “ERPQu is ready” means

ERPQu is not ready because it has Accounting, Stock, HR or Manufacturing menus. It is ready when a business can trust that:

- a user cannot escape their authority;
- a tenant/company cannot see another tenant/company's protected data;
- a submitted business event is preserved and auditable;
- every required GL/Stock effect either commits completely or not at all;
- finance balances and reverses correctly;
- stock survives concurrency and reconciles to valuation/GL;
- source documents remain line-level traceable;
- background work is durable and idempotent;
- extensions use a governed platform rather than bypassing core invariants;
- upgrades and restores preserve history.

That is the point at which ERPQu becomes an ERP platform that can be extended confidently instead of merely a system with many enterprise modules.

---

## 32. Final implementation rule

At any point in the program, when there is a conflict between **adding a feature** and **protecting an invariant**, protect the invariant. If a new module cannot be implemented without bypassing AuthorizationEngine, Document Lifecycle, UnitOfWork, Accounting Posting Engine, Stock Posting Engine or tenant/company scope, the new module is **not READY**.

The immediate next action is **QGOV-001 — Baseline delta audit**, followed by the Phase 0 controlled-baseline tasks. This avoids applying a 2026 audit finding blindly to a repository that may already have changed, while preserving the approved architecture and priority order.
