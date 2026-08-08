//! Domain Entities - Generic Platform Primitives Only (QARC-005 & 3R.1.1-002)
//!
//! Platform Kernel contains ONLY generic platform capability entities.
//! Business-specific entities belong strictly to their respective bounded contexts.

pub mod analytics;
pub mod approval_entity_type;
pub mod approval_workflow;
pub mod asset;
pub mod asset_details;
pub mod asset_expense;
pub mod asset_lifecycle;
pub mod audit;
pub mod audit_log;
pub mod category;
pub mod category_attribute_template;
pub mod contract_approval;
pub mod contract_document;
pub mod contract_renewal;
pub mod contract_template;
pub mod conversion;
pub mod cost_center;
pub mod department;
pub mod fuel;
pub mod loan;
pub mod location;
pub mod maintenance;
pub mod maintenance_template;
pub mod maintenance_team;
pub mod notification;
pub mod organization;
pub mod rbac;

pub mod sensor;
pub mod setting;
pub mod tax_renewal;
pub mod tier_config;
pub mod user;
pub mod work_order;
pub mod workflow;
pub mod data_import;

pub use analytics::*;
pub use approval_entity_type::*;
pub use approval_workflow::*;
pub use data_import::*;
pub use asset::*;
pub use asset_details::*;
pub use asset_expense::*;
pub use asset_lifecycle::*;
pub use audit::*;
pub use audit_log::{AuditLog, AuditLogEntry};
pub use category::*;
pub use category_attribute_template::*;
pub use contract_approval::*;
pub use contract_document::*;
pub use contract_renewal::*;
pub use contract_template::*;
pub use cost_center::*;
pub use department::*;
pub use fuel::*;
pub use loan::*;
pub use location::*;
pub use maintenance::*;
pub use maintenance_template::*;
pub use maintenance_team::*;
pub use notification::*;
pub use organization::*;
pub use rbac::*;

pub use sensor::*;
pub use setting::*;
pub use tax_renewal::*;
pub use tier_config::{Tier, TierBreakdown, TierConfig};
pub use user::User;
pub use user::*;
pub use work_order::*;
pub use workflow::*;

