use axum::extract::ConnectInfo;
use axum::{
    body::Body,
    http::{Request, Response, StatusCode},
    middleware::Next,
    response::IntoResponse,
};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::{
    sync::{Arc, Mutex, OnceLock},
    time::{Duration, Instant},
};

// Simple in-memory rate limiter configuration
const RATE_LIMIT_WINDOW: Duration = Duration::from_secs(60);
const MAX_REQUESTS_PER_WINDOW: u32 = 300; // 300 requests per minute per IP

#[derive(Clone)]
struct RateLimiter {
    requests: Arc<Mutex<HashMap<String, (u32, Instant)>>>,
}

impl RateLimiter {
    fn new() -> Self {
        Self {
            requests: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    fn check_rate_limit(&self, ip: String) -> bool {
        let mut requests = self.requests.lock().unwrap();
        let now = Instant::now();

        // Clean up expired entries occasionally (simplified cleanup)
        if requests.len() > 10000 {
            requests.retain(|_, (_, time)| now.duration_since(*time) < RATE_LIMIT_WINDOW);
        }

        let entry = requests.entry(ip).or_insert((0, now));

        // Reset window if expired
        if now.duration_since(entry.1) > RATE_LIMIT_WINDOW {
            entry.0 = 0;
            entry.1 = now;
        }

        if entry.0 < MAX_REQUESTS_PER_WINDOW {
            entry.0 += 1;
            true
        } else {
            false
        }
    }
}

// Global instance using OnceLock (standard library, no extra dependencies)
static GLOBAL_RATE_LIMITER: OnceLock<RateLimiter> = OnceLock::new();

pub async fn rate_limit_middleware(
    // We try to extract ConnectInfo for IP, but fallback if not available (e.g. behind proxy without correct setup)
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    req: Request<Body>,
    next: Next,
) -> Response<Body> {
    // Attempt to get client IP.
    let ip = addr.ip().to_string();

    let limiter = GLOBAL_RATE_LIMITER.get_or_init(RateLimiter::new);

    if limiter.check_rate_limit(ip) {
        next.run(req).await
    } else {
        (
            StatusCode::TOO_MANY_REQUESTS,
            "Rate limit exceeded. Please try again later.",
        )
            .into_response()
    }
}
