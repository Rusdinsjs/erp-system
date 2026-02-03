pub mod application;
pub mod domain;
pub mod infrastructure;
pub mod shared;

// Re-exports for convenience
pub use domain::errors::{DomainError, DomainResult};
pub use infrastructure::bus::EventBus;
pub use shared::utils::jwt::JwtConfig;
