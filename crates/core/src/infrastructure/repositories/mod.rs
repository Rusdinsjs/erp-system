//! Repositories Module - Generic Platform Data Access Primitives Only

pub mod approval_entity_type_repository;
pub mod approval_repository;
pub mod approval_workflow_repository;
pub mod audit_repository;
pub mod audit_trail_repository;
pub mod company_repository;
pub mod cost_center_repository;
pub mod location_repository;
pub mod naming_series_repository;
pub mod notification_repository;
pub mod outbox_repository;
pub mod rbac_repository;
pub mod settings_repository;
pub mod user_repository;

pub use approval_entity_type_repository::*;
pub use approval_repository::*;
pub use approval_workflow_repository::*;
pub use audit_repository::*;
pub use audit_trail_repository::*;
pub use company_repository::*;
pub use cost_center_repository::*;
pub use location_repository::*;
pub use naming_series_repository::*;
pub use notification_repository::*;
pub use outbox_repository::*;
pub use rbac_repository::*;
pub use settings_repository::*;
pub use user_repository::*;

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
