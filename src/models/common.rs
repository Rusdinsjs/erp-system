use serde::{Deserialize, Serialize};

/// Generic API Response wrapper
#[derive(Debug, Serialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub message: Option<String>,
    pub data: Option<T>,
}

impl<T> ApiResponse<T> {
    #[allow(dead_code)]
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            message: None,
            data: Some(data),
        }
    }

    pub fn success_with_message(data: T, message: &str) -> Self {
        Self {
            success: true,
            message: Some(message.to_string()),
            data: Some(data),
        }
    }

    #[allow(dead_code)]
    pub fn error(message: &str) -> ApiResponse<()> {
        ApiResponse {
            success: false,
            message: Some(message.to_string()),
            data: None,
        }
    }
}

/// Pagination request parameters
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub search: Option<String>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
}

impl PaginationParams {
    pub fn page(&self) -> i64 {
        self.page.unwrap_or(1).max(1)
    }

    pub fn per_page(&self) -> i64 {
        self.per_page.unwrap_or(10).min(100).max(1)
    }

    pub fn offset(&self) -> i64 {
        (self.page() - 1) * self.per_page()
    }
}

/// Paginated response
#[derive(Debug, Serialize)]
pub struct PaginatedResponse<T> {
    pub data: Vec<T>,
    pub total: i64,
    pub page: i64,
    pub per_page: i64,
    pub total_pages: i64,
}

impl<T> PaginatedResponse<T> {
    pub fn new(data: Vec<T>, total: i64, page: i64, per_page: i64) -> Self {
        let total_pages = (total as f64 / per_page as f64).ceil() as i64;
        Self {
            data,
            total,
            page,
            per_page,
            total_pages,
        }
    }
}

/// Currency model
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Currency {
    pub id: i32,
    pub code: String,
    pub name: String,
    pub symbol: Option<String>,
}

/// Unit model
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Unit {
    pub id: i32,
    pub code: String,
    pub name: String,
}

/// Asset Condition model
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct AssetCondition {
    pub id: i32,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
}
