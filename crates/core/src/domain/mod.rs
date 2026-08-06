//! Domain Layer - Core Business Logic
//!
//! This layer contains the core business entities, value objects,
//! domain events, and business rules. It has no external dependencies.

pub mod audit_trail;
pub mod authz;
pub mod document;
pub mod entities;
pub mod errors;
pub mod events;
pub mod intercompany;
pub mod naming_series;
pub mod outbox;
pub mod request_context;
pub mod tenant;
pub mod value_objects;

pub use audit_trail::{AuditAction, AuditTrailStore, DocumentAuditEntry};
pub use authz::*;
pub use document::*;
pub use entities::*;
pub use errors::*;
pub use events::*;
pub use intercompany::*;
pub use naming_series::NamingSeriesService;
pub use outbox::{OutboxEntry, OutboxStatus, OutboxStore};
pub use request_context::*;
pub use tenant::*;
pub use value_objects::*;
