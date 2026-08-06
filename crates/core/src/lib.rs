pub mod application;
pub mod domain;
pub mod infrastructure;
pub mod security_regression_suite;
pub mod shared;
pub mod kernel_invariant_tests;

// Re-exports for convenience
pub use domain::errors::{DomainError, DomainResult};
pub use infrastructure::bus::EventBus;
pub use shared::utils::jwt::JwtConfig;
