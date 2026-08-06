//! Domain Entities - Generic Platform Primitives Only (QARC-005 & 3R.1.1-002)
//!
//! Platform Kernel contains ONLY generic platform capability entities.
//! Business-specific entities belong strictly to their respective bounded contexts.

pub mod approval_entity_type;
pub mod approval_workflow;
pub mod audit;
pub mod audit_log;
pub mod company;
pub mod cost_center;
pub mod department;
pub mod notification;
pub mod organization;
pub mod rbac;
pub mod setting;
pub mod tier_config;
pub mod user;

pub use approval_entity_type::*;
pub use approval_workflow::*;
pub use audit::*;
pub use audit_log::{AuditLog, AuditLogEntry};
pub use company::*;
pub use cost_center::*;
pub use department::*;
pub use notification::*;
pub use organization::*;
pub use rbac::*;
pub use setting::*;
pub use tier_config::{Tier, TierBreakdown, TierConfig};
pub use user::User;
pub use user::*;
