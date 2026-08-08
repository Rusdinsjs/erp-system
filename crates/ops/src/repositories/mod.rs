pub mod fuel_repository;
pub mod lifecycle_repository;
pub mod maintenance_template_repository;
pub mod work_order_repository;

pub use fuel_repository::{FuelAnalyticsData, FuelRepository};
pub use lifecycle_repository::LifecycleRepository;
pub use maintenance_template_repository::MaintenanceTemplateRepository;
pub use work_order_repository::{WorkOrderAnalyticsData, WorkOrderRepository};
