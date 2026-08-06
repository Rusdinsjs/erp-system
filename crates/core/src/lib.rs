pub mod application;
pub mod architecture_boundary_tests;
pub mod domain;
pub mod infrastructure;
pub mod kernel_invariant_tests;
pub mod security_regression_suite;
pub mod shared;

// Re-exports for convenience
pub use domain::errors::{DomainError, DomainResult};
pub use infrastructure::bus::EventBus;
pub use shared::utils::jwt::JwtConfig;
