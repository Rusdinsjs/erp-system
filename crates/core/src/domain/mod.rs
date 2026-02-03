//! Domain Layer - Core Business Logic
//!
//! This layer contains the core business entities, value objects,
//! domain events, and business rules. It has no external dependencies.

pub mod entities;
pub mod errors;
pub mod events;
pub mod value_objects;

pub use entities::*;
pub use errors::*;
pub use events::*;
pub use value_objects::*;
