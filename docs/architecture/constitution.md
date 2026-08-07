# ERPQu Architecture Constitution

**Status**: Active & Mandatory  
**Version**: 1.0  
**Target Architecture**: Typed DDD ERP Core + Lean Metadata Kernel + Controlled App Extensibility  
**Core Motto**: *"Generic where convenient, typed where correctness matters."*

---

## 10 Immutable Architectural Rules

### Rule 1: Kernel Domain-Agnosticism
The Kernel MUST NOT contain any domain-specific business knowledge. It handles document lifecycle, auth, permission, audit, naming, jobs, files, and events.

### Rule 2: Typed Business-Critical Invariants
Business-critical logic (Accounting, Stock Valuation, Tax, Payroll) MUST be implemented in strongly-typed Rust code (DDD entities, value objects, and domain services).

### Rule 3: Separation of Metadata and Execution
Metadata engines (field, form, layout, custom fields, filters) MUST NEVER execute accounting, inventory, tax, or financial ledger posting logic.

### Rule 4: Immutability of Posted Records
Once a financial, GL, or stock entry is committed/posted, it is immutable. It CANNOT be edited or deleted by any application role. Corrections require an explicit reversal document.

### Rule 5: Domain Boundary & Ownership Isolation
No App or domain module may directly query or insert into internal database tables belonging to another App/domain sembarangan (arbitrarily).

### Rule 6: Synchronous & Atomic Critical Cross-Domain Operations
Operations that form a single business invariant (e.g., Invoice + GL + Stock) MUST be executed synchronously and atomically within a single `UnitOfWork` (database transaction).

### Rule 7: Async Events are NOT for Transaction Integrity
Async events and outbox MUST be used ONLY for non-critical side effects (email, notifications, webhooks, search indexing). They are not a substitute for synchronous transaction integrity for money and stock.

### Rule 8: Justified Abstractions
Abstractions MUST be created to solve immediate, concrete architectural requirements, NOT for hypothetical or speculative future flexibility.

### Rule 9: Pragmatic Generic CRUD
Generic CRUD mechanisms are acceptable and should be used for simple, non-critical master data. Do not over-engineer DDD for simple entities.

### Rule 10: Modular Monolith as Default
ERPQu is structured as a Modular Monolith. Microservices are forbidden unless there is a measured, explicit reason and ADR to separate them.

---

## Architectural Enforcement

- **Dependency Direction**: `Domain Layer` → `Application Layer` → `Infrastructure Layer`. The `domain` crate MUST NOT import `infrastructure` modules or database drivers (`sqlx`).
- **Numeric Precision**: Financial truth paths MUST use `rust_decimal::Decimal` / `NUMERIC` with explicit rounding. Binary floating point (`f64`, `FLOAT8`) is strictly forbidden for financial calculations.
- **Audit Immutability**: Database grants for runtime application roles (`erpqu_app` / `app_role`) MUST revoke `UPDATE` and `DELETE` on audit tables (`document_audit_trail`, `audit_logs`).
