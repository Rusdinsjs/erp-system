use axum::http::header;
use axum::{
    body::Body,
    http::{HeaderValue, Request, Response},
    middleware::Next,
};

/// Middleware to add security headers to all responses
pub async fn security_headers_middleware(req: Request<Body>, next: Next) -> Response<Body> {
    let mut response = next.run(req).await;
    let headers = response.headers_mut();

    // Prevent clicking (clickjacking)
    headers.insert(header::X_FRAME_OPTIONS, HeaderValue::from_static("DENY"));

    // Prevent MIME type sniffing
    headers.insert(
        header::X_CONTENT_TYPE_OPTIONS,
        HeaderValue::from_static("nosniff"),
    );

    // Enable XSS filtering
    headers.insert(
        header::X_XSS_PROTECTION,
        HeaderValue::from_static("1; mode=block"),
    );

    // Strict Transport Security (HSTS) - 1 year
    headers.insert(
        header::STRICT_TRANSPORT_SECURITY,
        HeaderValue::from_static("max-age=31536000; includeSubDomains; preload"),
    );

    // Content Security Policy (Basic restrictive policy - adjust as needed for frontend)
    // Note: This might need adjustment if loading external scripts/styles
    // Keeping it relatively permissive for now to avoid breaking existing frontend functionality
    // but enforcing some basics.
    headers.insert(
        header::CONTENT_SECURITY_POLICY,
        HeaderValue::from_static("default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss:; font-src 'self' data: https:"),
    );

    response
}
