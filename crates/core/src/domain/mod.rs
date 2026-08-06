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
pub mod intercompany;
pub mod indonesia_localization;
pub mod manufacturing_pos;
pub mod metadata_kernel;
pub mod naming_series;
pub mod operational_erp;
pub mod outbox;
pub mod platform_services;
pub mod production_engineering;
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
pub use indonesia_localization::*;
pub use intercompany::*;
pub use manufacturing_pos::*;
pub use metadata_kernel::*;
pub use naming_series::NamingSeriesConfig;
pub use operational_erp::*;
pub use outbox::{OutboxEntry, OutboxStatus};
pub use platform_services::*;
pub use production_engineering::*;
pub use reporting_platform::*;
pub use request_context::*;
pub use tenant::*;
pub use value_objects::*;
