---
description: How to add a new API endpoint/feature
---

# Adding a New Feature Workflow

This workflow describes how to add a new feature following the DDD architecture.

## 1. Domain Layer (Business Logic)

### 1.1 Create Entity
Create entity in `src/domain/entities/<feature>.rs`:
```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Feature {
    pub id: Uuid,
    pub name: String,
    // ... other fields
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

### 1.2 Register in mod.rs
Add to `src/domain/entities/mod.rs`:
```rust
pub mod feature;
pub use feature::*;
```

## 2. Application Layer (Use Cases)

### 2.1 Create DTO
Create DTOs in `src/application/dto/<feature>_dto.rs`:
```rust
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct CreateFeatureRequest {
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateFeatureRequest {
    pub name: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct FeatureResponse {
    pub id: Uuid,
    pub name: String,
}
```

### 2.2 Create Service
Create service in `src/application/services/<feature>_service.rs`:
```rust
use crate::domain::entities::Feature;
use crate::infrastructure::repositories::FeatureRepository;

pub struct FeatureService {
    repository: FeatureRepository,
}

impl FeatureService {
    pub fn new(repository: FeatureRepository) -> Self {
        Self { repository }
    }

    pub async fn create(&self, request: CreateFeatureRequest) -> Result<Feature, Error> {
        // Business logic here
        self.repository.create(feature).await
    }
    
    pub async fn list(&self, params: PaginationParams) -> Result<Vec<Feature>, Error> {
        self.repository.list(params).await
    }
}
```

## 3. Infrastructure Layer (Data Access)

### 3.1 Create Repository
Create repository in `src/infrastructure/repositories/<feature>_repository.rs`:
```rust
use sqlx::PgPool;
use uuid::Uuid;

pub struct FeatureRepository {
    pool: PgPool,
}

impl FeatureRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, feature: Feature) -> Result<Feature, sqlx::Error> {
        sqlx::query_as!(
            Feature,
            r#"
            INSERT INTO features (name)
            VALUES ($1)
            RETURNING id, name, created_at, updated_at
            "#,
            feature.name
        )
        .fetch_one(&self.pool)
        .await
    }
}
```

## 4. API Layer (Presentation)

### 4.1 Create Handler
Create handler in `src/api/handlers/<feature>_handler.rs`:
```rust
use axum::{extract::State, http::StatusCode, Json};
use crate::application::services::FeatureService;

pub async fn create_feature(
    State(service): State<FeatureService>,
    Json(payload): Json<CreateFeatureRequest>,
) -> Result<Json<FeatureResponse>, (StatusCode, String)> {
    let feature = service.create(payload).await
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
    
    Ok(Json(FeatureResponse::from(feature)))
}
```

### 4.2 Create Routes
Create routes in `src/api/routes/<feature>_routes.rs`:
```rust
use axum::{routing::{get, post}, Router};
use crate::api::handlers::feature_handler::*;

pub fn feature_routes() -> Router<AppState> {
    Router::new()
        .route("/api/features", get(list_features).post(create_feature))
        .route("/api/features/:id", get(get_feature).put(update_feature).delete(delete_feature))
}
```

### 4.3 Register Routes
Add to `src/api/routes/mod.rs`:
```rust
pub mod feature_routes;
```

Add to main router in `src/api/server.rs`:
```rust
.merge(feature_routes::feature_routes())
```

## 5. Database Migration

Create migration:
```bash
sqlx migrate add add_features_table
```

Add SQL:
```sql
CREATE TABLE features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

Run migration:
```bash
sqlx migrate run
```

## 6. Testing

Create tests in `src/tests/<feature>_tests.rs`:
```rust
#[tokio::test]
async fn test_create_feature() {
    // Test implementation
}
```

Run tests:
```bash
cargo test feature_tests
```
