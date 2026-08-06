# ERPQu Architecture Constitution

**Status**: Active & Mandatory  
**Version**: 1.0  
**Target Architecture**: Typed DDD ERP Core + Lean Metadata Kernel + Controlled App Extensibility  
**Core Motto**: *"Generic where convenient, typed where correctness matters."*

---

## Immutable Architectural Rules

### Rule 1: Kernel Domain-Agnosticism
The Kernel (`crates/core/src/domain/`, `crates/core/src/infrastructure/database/`) MUST NOT contain any domain-specific business knowledge. Concepts such as General Ledger (GL), Stock Ledger, Taxes, Depreciation, Invoices, Purchase Orders, Valuation, or Payroll belong strictly to their respective domain crates (`crates/finance`, `crates/ops`, etc.) or application modules.

### Rule 2: Typed Business-Critical Invariants
Business-critical logic, accounting rules, inventory control, and financial balances MUST be implemented in strongly-typed Rust code (DDD entities, value objects, and domain services). They MUST NOT be delegated to dynamic metadata DSLs, JSON blobs, or runtime scripting engines.

### Rule 3: Separation of Metadata and Execution
Metadata engines (custom fields, form layouts, dynamic attributes) are purely for presentation, UI customization, and non-critical data capture. Metadata engines MUST NEVER execute accounting, inventory, tax, or financial posting logic.

### Rule 4: Immutability of Posted Records & Reversal Mechanics
Once a financial, GL, or stock entry is committed/posted, it is **immutable**. It CANNOT be edited or deleted by any application role. Any corrections MUST be performed by issuing an explicit, traceable reversal document or entry.

### Rule 5: Domain Boundary & Ownership Isolation
No domain module or application service may directly query or insert into internal database tables belonging to another domain module. Cross-domain interactions MUST pass through explicit service contracts, public interfaces, or shared UoW transactions. Direct INSERT into another domain's ledger tables is strictly forbidden.

### Rule 6: Synchronous & Atomic Critical Cross-Domain Operations
Operations that form a single business invariant (e.g., Sales Invoice creation + GL Journal entry creation) MUST be executed synchronously and atomically within a single `UnitOfWork` (database transaction). If any part of the operation fails, the entire transaction MUST roll back.

### Rule 7: Async Events for Non-Critical Side Effects Only
Transactional outbox and asynchronous event buses (`OutboxStore`, `EventBus`) MUST be used ONLY for non-critical side effects (email notifications, webhooks, search indexing, background worker dispatch). Async events MUST NOT replace synchronous database transaction integrity for financial or inventory postings.

### Rule 8: Justified Abstractions
Abstractions MUST be created to solve immediate, concrete architectural requirements, NOT for hypothetical future flexibility. Speculative abstractions, over-engineered generic framework layers, and unnecessary design patterns are forbidden.

### Rule 9: Pragmatic Generic CRUD
Generic CRUD mechanisms are acceptable for simple, non-critical master data (e.g., tags, simple reference tables). Business transactions, financial documents, and core entities MUST use strongly-typed contracts.

### Rule 10: Modular Monolith as Default
ERPQu is structured as a Modular Monolith. Microservices, distributed network boundaries between internal modules, and runtime RPC complexity are forbidden unless explicitly required and approved through an ADR.

### Rule 11: Single Source of Business Truth
The authoritative business rules and validation logic reside in compiled Rust domain code. Metadata files, database triggers, and UI scripts MUST NOT duplicate or override core domain invariants.

### Rule 12: Kernel Primitive Justification Principle
Every type, struct, trait, or utility placed in `crates/core` MUST satisfy the prompt: *"Why is this domain-agnostic and deserving of a place in the Kernel?"* If a primitive contains accounting, inventory, or document-specific business rules, it MUST be relocated to the appropriate domain crate.

---

## Architectural Enforcement

- **Dependency Direction**: `Domain Layer` → `Application Layer` → `Infrastructure Layer`. The `domain` crate MUST NOT import `infrastructure` modules or database drivers (`sqlx`).
- **Numeric Precision**: Financial truth paths MUST use `rust_decimal::Decimal` / `NUMERIC` with explicit rounding. Binary floating point (`f64`, `FLOAT8`) is strictly forbidden for financial calculations.
- **Audit Immutability**: Database grants for runtime application roles (`erpqu_app` / `app_role`) MUST revoke `UPDATE` and `DELETE` on audit tables (`document_audit_trail`, `audit_logs`).
