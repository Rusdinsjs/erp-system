//! Domain Entities
//!
//! Core business entities representing the main concepts in the asset management domain.

pub mod asset;
pub mod asset_details;
pub mod asset_lifecycle;
pub mod audit;
pub mod category;
pub mod client;
pub mod conversion;
pub mod department;
pub mod employee;
pub mod loan;
pub mod location;
pub mod maintenance;
pub mod notification;
pub mod organization;
pub mod rbac;
pub mod rental;
pub mod rental_billing;
pub mod rental_timesheet;
pub mod sensor;
pub mod user;
pub mod vendor;
pub mod work_order;

pub use asset::{Asset, AssetHistory, AssetSummary};
pub use asset_details::*;
pub use asset_lifecycle::*;
pub use audit::*;
pub use category::Category;
pub use client::*;
pub use department::*;
pub use employee::*;
pub use loan::*;
pub use location::Location;
pub use maintenance::*;
pub use maintenance::{MaintenanceRecord, MaintenanceType};
pub use notification::*;
pub use organization::*;
pub use rbac::*;
pub use rental::*;
pub use rental_billing::*;
pub use rental_timesheet::*;
pub use sensor::*;
pub use user::User;
pub use user::*;
pub use vendor::*;
pub use work_order::*;
