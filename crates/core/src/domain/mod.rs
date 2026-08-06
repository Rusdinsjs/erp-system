//! Domain Layer - Core Business Logic
//!
//! This layer contains the core business entities, value objects,
//! domain events, and business rules. It has NO dependencies on infrastructure or database.

pub mod app_system;
pub mod audit_trail;
pub mod authz;
pub mod data_migration;
pub mod document;
pub mod entities;
pub mod errors;
pub mod events;
pub mod metadata_kernel;
pub mod naming_series;
pub mod outbox;
pub mod platform_services;
pub mod sre_platform;
pub mod reporting_platform;
pub mod request_context;
pub mod tenant;
pub mod value_objects;

pub use app_system::*;
pub use audit_trail::{AuditAction, DocumentAuditEntry};
pub use authz::*;
pub use data_migration::*;
pub use document::{
    Amendable, Cancellable, DocumentHeader, DocumentLine, DocumentMetadata, DocumentStatus,
    SubmissionEnvelope, Submittable, WorkflowEnabled,
};
pub use entities::*;
pub use errors::*;
pub use events::*;
pub use metadata_kernel::*;
pub use naming_series::NamingSeriesConfig;
pub use outbox::{OutboxEntry, OutboxStatus};
pub use platform_services::*;
pub use sre_platform::*;
pub use reporting_platform::*;
pub use request_context::*;
pub use tenant::*;
pub use value_objects::*;
