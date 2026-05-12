//! Management System ERP Backend
//!
//! An integrated management system (Asset, HRD, Finance, Inventory) built with Rust and DDD architecture.

pub mod api;
pub mod application;
pub mod domain;
pub mod infrastructure;
pub mod shared;

// Re-exports for convenience
pub use api::*;
pub use application::dto;
pub use domain::entities;
pub use domain::errors::DomainError;
pub use infrastructure::repositories;
pub use shared::config::AppConfig;
pub use shared::errors::{AppError, AppResult};
