//! API Middleware

pub mod auth;
pub mod rate_limit;
pub mod rbac;

// Explicitly export to avoid ambiguity
pub use auth::auth_middleware;
pub use rbac::{
    admin_only_middleware, extract_user_claims, org_scope_middleware, permission_middleware,
};
