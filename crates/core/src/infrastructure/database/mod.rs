//! Database Module
//!
//! Database connection, unit-of-work transaction management, and command context.

pub mod command_context;
pub mod connection;
pub mod unit_of_work;

pub use command_context::{CommandContext, IdempotencyDecision, IdempotencyStore};
pub use connection::*;
pub use unit_of_work::UnitOfWork;
