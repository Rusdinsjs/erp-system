use rust_decimal::Decimal;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::application::dto::analytics_dto::{
    AssetRoiResponse, ConditionDistribution, MonthlyTrend,
};
use crate::domain::entities::AssetState;
use crate::domain::errors::{DomainError, DomainResult};

#[derive(Clone)]
pub struct AnalyticsService {
    pool: PgPool,
}

impl AnalyticsService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Get monthly maintenance costs for the last 12 months
    pub async fn get_monthly_maintenance_trends(&self) -> DomainResult<Vec<MonthlyTrend>> {
        let rows = sqlx::query(
            r#"
            SELECT 
                TO_CHAR(actual_end_date, 'YYYY-MM') as month,
                COALESCE(SUM(actual_cost + parts_cost), 0) as total_cost,
                COUNT(*) as count
            FROM maintenance_work_orders
            WHERE status = 'completed' 
            AND actual_end_date >= CURRENT_DATE - INTERVAL '12 months'
            GROUP BY month
            ORDER BY month ASC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e: sqlx::Error| DomainError::ExternalServiceError {
            service: "db".into(),
            message: e.to_string(),
        })?;

        Ok(rows
            .into_iter()
            .map(|r| MonthlyTrend {
                month: r.try_get::<String, _>("month").unwrap_or_default(),
                total_cost: r.try_get::<Decimal, _>("total_cost").unwrap_or(Decimal::ZERO),
                count: r.try_get::<i64, _>("count").unwrap_or(0),
            })
            .collect())
    }

    /// Get distribution of assets by condition
    pub async fn get_asset_condition_distribution(
        &self,
    ) -> DomainResult<Vec<ConditionDistribution>> {
        let rows = sqlx::query(
            r#"
            SELECT 
                COALESCE(ac.name, 'Unknown') as condition_name,
                COUNT(a.id) as count,
                COALESCE(SUM(a.purchase_price), 0) as total_value
            FROM assets a
            LEFT JOIN asset_conditions ac ON a.condition_id = ac.id
            GROUP BY ac.name
            ORDER BY count DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e: sqlx::Error| DomainError::ExternalServiceError {
            service: "db".into(),
            message: e.to_string(),
        })?;

        Ok(rows
            .into_iter()
            .map(|r| ConditionDistribution {
                condition: r.try_get::<String, _>("condition_name").unwrap_or_else(|_| "Unknown".to_string()),
                count: r.try_get::<i64, _>("count").unwrap_or(0),
                total_value: r.try_get::<Decimal, _>("total_value").unwrap_or(Decimal::ZERO),
            })
            .collect())
    }

    /// Get distribution of assets by status (lifecycle)
    pub async fn get_asset_status_distribution(&self) -> DomainResult<Vec<ConditionDistribution>> {
        let rows = sqlx::query(
            r#"
            SELECT 
                status,
                COUNT(id) as count,
                COALESCE(SUM(purchase_price), 0) as total_value
            FROM assets
            WHERE status != 'archived'
            GROUP BY status
            ORDER BY count DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e: sqlx::Error| DomainError::ExternalServiceError {
            service: "db".into(),
            message: e.to_string(),
        })?;

        let mut normalization_map: std::collections::HashMap<String, (i64, Decimal)> =
            std::collections::HashMap::new();

        for row in rows {
            let raw_status: String = row.try_get("status").unwrap_or_else(|_| "Unknown".to_string());
            let count: i64 = row.try_get("count").unwrap_or(0);
            let value: Decimal = row.try_get("total_value").unwrap_or(Decimal::ZERO);

            let normalized_status = AssetState::from_str(&raw_status)
                .map(|s| s.as_str().to_string())
                .unwrap_or(raw_status);

            let entry = normalization_map
                .entry(normalized_status)
                .or_insert((0, Decimal::ZERO));
            entry.0 += count;
            entry.1 += value;
        }

        let mut result: Vec<ConditionDistribution> = normalization_map
            .into_iter()
            .map(|(condition, (count, total_value))| ConditionDistribution {
                condition,
                count,
                total_value,
            })
            .collect();

        result.sort_by(|a, b| b.count.cmp(&a.count));

        Ok(result)
    }

    pub async fn get_asset_roi(&self, asset_id: Uuid) -> DomainResult<AssetRoiResponse> {
        let asset_row = sqlx::query(
            r#"SELECT 
                a.name, a.asset_code, a.purchase_price, a.purchase_date,
                d.accumulated_depreciation, d.book_value
            FROM assets a
            CROSS JOIN LATERAL (
                SELECT accumulated_depreciation, book_value 
                FROM calculate_depreciation(a.id, CURRENT_DATE)
            ) d
            WHERE a.id = $1"#,
        )
        .bind(asset_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e: sqlx::Error| DomainError::ExternalServiceError {
            service: "db".into(),
            message: e.to_string(),
        })?
        .ok_or_else(|| DomainError::not_found("Asset", asset_id))?;

        let revenue_row = sqlx::query(
            r#"SELECT 
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COUNT(*) as billing_count,
                COALESCE(SUM(period_end - period_start + 1), 0) as utilization_days
            FROM rental_billing_periods rbp
            JOIN rental_items ri ON rbp.rental_item_id = ri.id
            WHERE ri.asset_id = $1
            AND rbp.status IN ('approved', 'invoiced', 'paid')"#,
        )
        .bind(asset_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e: sqlx::Error| DomainError::ExternalServiceError {
            service: "db".into(),
            message: e.to_string(),
        })?;

        let maintenance_row = sqlx::query(
            r#"SELECT 
                COALESCE(SUM(actual_cost), 0) as total_labor,
                COALESCE(SUM(parts_cost), 0) as total_parts,
                COUNT(*) as wo_count
            FROM maintenance_work_orders
            WHERE asset_id = $1 AND status = 'completed'"#,
        )
        .bind(asset_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e: sqlx::Error| DomainError::ExternalServiceError {
            service: "db".into(),
            message: e.to_string(),
        })?;

        let purchase_price: Decimal = asset_row.try_get("purchase_price").unwrap_or(Decimal::ZERO);
        let total_revenue: Decimal = revenue_row.try_get("total_revenue").unwrap_or(Decimal::ZERO);
        let total_labor: Decimal = maintenance_row.try_get("total_labor").unwrap_or(Decimal::ZERO);
        let total_parts: Decimal = maintenance_row.try_get("total_parts").unwrap_or(Decimal::ZERO);
        let m_cost = total_labor + total_parts;
        let accum_dep: Decimal = asset_row.try_get("accumulated_depreciation").unwrap_or(Decimal::ZERO);

        let net_profit = total_revenue - (m_cost + accum_dep);

        let roi_percentage = if !purchase_price.is_zero() {
            (net_profit / purchase_price) * Decimal::from(100)
        } else {
            Decimal::ZERO
        };

        let purchase_date: Option<chrono::NaiveDate> = asset_row.try_get("purchase_date").ok();

        Ok(AssetRoiResponse {
            asset_id,
            asset_name: asset_row.get("name"),
            asset_code: asset_row.get("asset_code"),
            purchase_price,
            purchase_date: purchase_date
                .map(|d| d.to_string())
                .unwrap_or_default(),
            book_value: asset_row.try_get("book_value").unwrap_or(Decimal::ZERO),
            accumulated_depreciation: accum_dep,
            total_rental_revenue: total_revenue,
            billing_count: revenue_row.try_get("billing_count").unwrap_or(0),
            maintenance_cost: total_labor,
            parts_cost: total_parts,
            work_order_count: maintenance_row.try_get("wo_count").unwrap_or(0),
            net_profit,
            roi_percentage,
            utilization_days: revenue_row.try_get("utilization_days").unwrap_or(0),
        })
    }
}
