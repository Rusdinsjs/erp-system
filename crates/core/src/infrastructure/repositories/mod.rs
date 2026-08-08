//! Repositories Module - Generic Platform Data Access Primitives Only

pub mod approval_entity_type_repository;
pub mod approval_repository;
pub mod approval_workflow_repository;
pub mod audit_repository;
pub mod audit_trail_repository;
pub mod cost_center_repository;
pub mod location_repository;
pub mod naming_series_repository;
pub mod metadata_repository;
pub mod notification_repository;
pub mod outbox_repository;
pub mod rbac_repository;
pub mod settings_repository;
pub mod user_repository;

// Restored repositories
pub mod asset_expense_repository;
pub mod asset_repository;
pub mod category_repository;
pub mod category_template_repository;
pub mod conversion_repository;
pub mod fuel_repository;
pub mod lifecycle_repository;
pub mod loan_repository;
pub mod maintenance_repository;
pub mod maintenance_template_repository;
pub mod maintenance_team_repository;
pub mod sensor_repository;
pub mod tax_renewal_repository;
pub mod work_order_repository;

pub use approval_entity_type_repository::*;
pub use approval_repository::*;
pub use approval_workflow_repository::*;
pub use audit_repository::*;
pub use audit_trail_repository::*;
pub use cost_center_repository::*;
pub use location_repository::*;
pub use naming_series_repository::*;
pub use metadata_repository::*;
pub use notification_repository::*;
pub use outbox_repository::*;
pub use rbac_repository::*;
pub use settings_repository::*;
pub use user_repository::*;

pub use asset_expense_repository::*;
pub use asset_repository::*;
pub use category_repository::*;
pub use category_template_repository::*;
pub use conversion_repository::*;
pub use fuel_repository::*;
pub use lifecycle_repository::*;
pub use loan_repository::*;
pub use maintenance_repository::*;
pub use maintenance_template_repository::*;
pub use maintenance_team_repository::*;
pub use sensor_repository::*;
pub use tax_renewal_repository::*;
pub use work_order_repository::*;

/// Base repository trait
#[async_trait::async_trait]
pub trait Repository<T, ID> {
    async fn find_by_id(&self, id: ID) -> Result<Option<T>, sqlx::Error>;
    async fn find_all(&self, limit: i64, offset: i64) -> Result<Vec<T>, sqlx::Error>;
    async fn count(&self) -> Result<i64, sqlx::Error>;
    async fn create(&self, entity: T) -> Result<T, sqlx::Error>;
    async fn update(&self, entity: T) -> Result<T, sqlx::Error>;
    async fn delete(&self, id: ID) -> Result<bool, sqlx::Error>;
}
