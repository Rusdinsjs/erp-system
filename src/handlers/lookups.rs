use axum::{extract::State, http::StatusCode, Json};
use sqlx::PgPool;

use crate::models::{AssetCondition, Currency, Unit};

/// Get all currencies
pub async fn list_currencies(
    State(pool): State<PgPool>,
) -> Result<Json<Vec<Currency>>, (StatusCode, String)> {
    let currencies = sqlx::query_as::<_, Currency>("SELECT * FROM currencies ORDER BY code")
        .fetch_all(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(currencies))
}

/// Get all units
pub async fn list_units(
    State(pool): State<PgPool>,
) -> Result<Json<Vec<Unit>>, (StatusCode, String)> {
    let units = sqlx::query_as::<_, Unit>("SELECT * FROM units ORDER BY code")
        .fetch_all(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(units))
}

/// Get all asset conditions
pub async fn list_asset_conditions(
    State(pool): State<PgPool>,
) -> Result<Json<Vec<AssetCondition>>, (StatusCode, String)> {
    let conditions =
        sqlx::query_as::<_, AssetCondition>("SELECT * FROM asset_conditions ORDER BY id")
            .fetch_all(&pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(conditions))
}
