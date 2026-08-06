//! API Middleware

pub mod auth;
pub mod rate_limit;
pub mod rbac;
pub mod request_context;
pub mod security_headers;
pub mod tenant;

// Explicitly export to avoid ambiguity
pub use auth::auth_middleware;
pub use request_context::request_context_middleware;
pub use tenant::tenant_middleware;
