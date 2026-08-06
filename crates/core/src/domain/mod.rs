//! Domain Layer - Core Business Logic
//!
//! This layer contains the core business entities, value objects,
//! domain events, and business rules. It has NO dependencies on infrastructure or database.

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

pub use audit_trail::{AuditAction, DocumentAuditEntry};
pub use authz::*;
pub use document::{
    Amendable, Cancellable, DocumentHeader, DocumentLine, DocumentMetadata, DocumentStatus,
    HasLines, SourceRef, Submittable, WorkflowEnabled,
};
pub use entities::*;
pub use errors::*;
pub use events::*;
pub use intercompany::*;
pub use naming_series::NamingSeriesConfig;
pub use outbox::{OutboxEntry, OutboxStatus};
pub use request_context::*;
pub use tenant::*;
pub use value_objects::*;
