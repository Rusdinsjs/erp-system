use crate::domain::errors::{DomainError, DomainResult};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetRoiResponse {
    pub asset_id: Uuid,
    pub asset_name: String,
    pub asset_code: String,

    // Financial Status
    pub purchase_price: Decimal,
    pub purchase_date: String,
    pub book_value: Decimal,
    pub accumulated_depreciation: Decimal,

    // Revenue
    pub total_rental_revenue: Decimal,
    pub billing_count: i64,

    // Expenses
    pub maintenance_cost: Decimal,
    pub parts_cost: Decimal,
    pub work_order_count: i64,

    // ROI Metrics
    pub net_profit: Decimal, // Revenue - (Maintenance + Accumulated Depreciation)
    pub roi_percentage: Decimal, // (Net Profit / Purchase Price) * 100
    pub utilization_days: i64,
}

#[derive(Clone)]
pub struct AnalyticsService {
    pool: PgPool,
}

impl AnalyticsService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn get_asset_roi(&self, asset_id: Uuid) -> DomainResult<AssetRoiResponse> {
        // 1. Get Asset Basic Info & Depreciation
        let asset_info = sqlx::query!(
            r#"SELECT 
                a.name, a.asset_code, a.purchase_price, a.purchase_date,
                d.accumulated_depreciation, d.book_value
            FROM assets a
            CROSS JOIN LATERAL (
                SELECT accumulated_depreciation, book_value 
                FROM calculate_depreciation(a.id, CURRENT_DATE)
            ) d
            WHERE a.id = $1"#,
            asset_id
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| DomainError::ExternalServiceError {
            service: "db".into(),
            message: e.to_string(),
        })?
        .ok_or_else(|| DomainError::not_found("Asset", asset_id))?;

        // 2. Get Rental Revenue
        let revenue = sqlx::query!(
            r#"SELECT 
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COUNT(*) as billing_count,
                COALESCE(SUM(period_end - period_start + 1), 0) as utilization_days
            FROM rental_billing_periods
            WHERE rental_id IN (SELECT id FROM rentals WHERE asset_id = $1)
            AND status IN ('approved', 'invoiced', 'paid')"#,
            asset_id
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::ExternalServiceError {
            service: "db".into(),
            message: e.to_string(),
        })?;

        // 3. Get Maintenance Expenses
        let maintenance = sqlx::query!(
            r#"SELECT 
                COALESCE(SUM(actual_cost), 0) as total_labor,
                COALESCE(SUM(parts_cost), 0) as total_parts,
                COUNT(*) as wo_count
            FROM maintenance_work_orders
            WHERE asset_id = $1 AND status = 'completed'"#,
            asset_id
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::ExternalServiceError {
            service: "db".into(),
            message: e.to_string(),
        })?;

        let purchase_price = asset_info.purchase_price.unwrap_or(Decimal::ZERO);
        let total_revenue = revenue.total_revenue.unwrap_or(Decimal::ZERO);
        let m_cost = (maintenance.total_labor.unwrap_or(Decimal::ZERO))
            + (maintenance.total_parts.unwrap_or(Decimal::ZERO));
        let accum_dep = asset_info.accumulated_depreciation.unwrap_or(Decimal::ZERO);

        let net_profit = total_revenue - (m_cost + accum_dep);

        let roi_percentage = if !purchase_price.is_zero() {
            (net_profit / purchase_price) * Decimal::from(100)
        } else {
            Decimal::ZERO
        };

        Ok(AssetRoiResponse {
            asset_id,
            asset_name: asset_info.name,
            asset_code: asset_info.asset_code,
            purchase_price,
            purchase_date: asset_info
                .purchase_date
                .map(|d| d.to_string())
                .unwrap_or_default(),
            book_value: asset_info.book_value.unwrap_or(Decimal::ZERO),
            accumulated_depreciation: accum_dep,
            total_rental_revenue: total_revenue,
            billing_count: revenue.billing_count.unwrap_or(0),
            maintenance_cost: maintenance.total_labor.unwrap_or(Decimal::ZERO),
            parts_cost: maintenance.total_parts.unwrap_or(Decimal::ZERO),
            work_order_count: maintenance.wo_count.unwrap_or(0),
            net_profit,
            roi_percentage,
            utilization_days: revenue.utilization_days.map(|d| d as i64).unwrap_or(0),
        })
    }
}
