pub mod repositories;

pub mod attendance_service;
pub mod fuel_service;
pub mod geofence_service;
pub mod inventory_service;
pub mod leave_service;
pub mod rental_billing_service;
pub mod rental_service;
pub mod tax_renewal_service;
pub mod timesheet_service;
pub mod work_order_service;

pub use attendance_service::AttendanceService;
pub use fuel_service::{FuelRequest, FuelService};
pub use geofence_service::GeofenceService;
pub use inventory_service::InventoryService;
pub use leave_service::LeaveService;
pub use rental_billing_service::RentalBillingService;
pub use rental_service::RentalService;
pub use tax_renewal_service::TaxRenewalService;
pub use timesheet_service::TimesheetService;
pub use work_order_service::{CreateWorkOrderRequest, WorkOrderService};
