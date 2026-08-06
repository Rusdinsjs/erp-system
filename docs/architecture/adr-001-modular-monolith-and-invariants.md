# ADR-001: ERPQu Core Architecture & Invariant Principles

**Status**: APPROVED  
**Date**: 2026-08-06  
**Deciders**: ERPQu Core Architecture Team / Antigravity Agent  

---

## Context

ERPQu is an ERP Platform & Enterprise Asset Operations system written in Rust (Axum, SQLx, PostgreSQL, Redis) with React (web-admin) and Expo (mobile) clients.
Previous proposals suggested microservices or full rewrites to match ERPNext feature counts. However, deep technical auditing established that a modular monolith with hardened kernel invariants is the safest and most performant architecture.

---

## Key Decisions

1. **Modular Monolith Architecture**:
   - ERPQu will remain a single compiled Rust binary with clean internal domain boundaries.
   - Microservices are deferred until measured scale metrics explicitly justify service isolation.

2. **Server-Side Authorization & Default Deny**:
   - All authorization logic resides on the server.
   - Frontend route/element guards are UX helpers only; the API enforces permission checks (`Default DENY`).

3. **Financial Precision (Decimal Policy)**:
   - All financial amounts, interest, rates, tax calculations, and valued inventory quantities must use `rust_decimal::Decimal`.
   - `f64` / floating-point binary types are strictly prohibited for monetary calculations.

4. **Immutable Ledgers & Reversal Lifecycle**:
   - Financial (GL) and Inventory (Stock) entries are append-only.
   - Submitted vouchers/documents cannot be deleted or edited in place. Corrections require formal cancellation and reversing entries.

5. **Atomic UnitOfWork & Transactional Outbox**:
   - Business state changes and required ledger postings must commit inside a single database transaction.
   - Asynchronous side-effects (notifications, webhooks, search indexing) are written to a transactional outbox table within the same transaction.

6. **Isolation Boundaries (Tenant / Company)**:
   - `Tenant/Site` defines SaaS data isolation boundary (DB/site-per-tenant target).
   - `Company` defines the legal accounting entity.
   - Repositories must enforce company/tenant scoping on all queries.

---

## Consequences

- High data integrity and financial correctness.
- Deterministic testability across all core modules.
- Fast execution and low operational overhead compared to distributed microservices.
