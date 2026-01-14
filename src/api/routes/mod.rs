//! API Routes

pub mod analytics_routes;
pub mod approval_routes;
pub mod billing_routes;
pub mod category_routes;
pub mod client_routes;
pub mod conversion_routes;
pub mod rental_routes;
pub mod routes;
pub mod timesheet_routes;

pub use routes::*;
pub mod data_routes;
pub mod location_routes;
pub mod mobile_routes;
pub use billing_routes::billing_routes;
pub use timesheet_routes::timesheet_routes;
