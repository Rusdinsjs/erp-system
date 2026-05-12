//! API Routes

pub mod approval_routes;
pub mod asset_expense_routes;
pub mod billing_routes;
pub mod category_routes;
pub mod client_routes;
pub mod contract_routes;
pub mod conversion_routes;
pub mod inventory_routes;
pub mod main_router;
pub mod maintenance_routes;
pub mod rental_routes;
pub mod timesheet_routes;

pub use main_router::*;
pub mod fuel_routes;
pub mod location_routes;
pub mod mobile_routes;
pub mod settings_routes;
pub mod tax_renewal_routes;
