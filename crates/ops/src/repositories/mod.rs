pub mod fuel_repository;
pub mod lifecycle_repository;
pub mod maintenance_template_repository;
pub mod rental_billing_repository;
pub mod rental_repository;
pub mod work_order_repository;

pub use fuel_repository::{FuelAnalyticsData, FuelRepository};
pub use lifecycle_repository::LifecycleRepository;
pub use maintenance_template_repository::MaintenanceTemplateRepository;
pub use rental_billing_repository::RentalBillingRepository;
pub use rental_repository::RentalRepository;
pub use work_order_repository::{WorkOrderAnalyticsData, WorkOrderRepository};
