//! Value Objects
//!
//! Immutable value types that represent domain concepts without identity.

pub mod email;
pub mod money;
pub mod phone;

pub use email::*;
pub use money::*;
pub use phone::*;
