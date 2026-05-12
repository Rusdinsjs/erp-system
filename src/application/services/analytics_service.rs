use crate::domain::entities::AssetState;
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonthlyTrend {
    pub month: String,
    #[serde(rename = "maintenance_cost")]
    pub total_cost: Decimal,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConditionDistribution {
    #[serde(rename = "status")]
    pub condition: String,
    pub count: i64,
    pub total_value: Decimal,
}

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
        let rows = sqlx::query!(
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
            "#
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::ExternalServiceError {
            service: "db".into(),
            message: e.to_string(),
        })?;

        Ok(rows
            .into_iter()
            .map(|r| MonthlyTrend {
                month: r.month.unwrap_or_default(),
                total_cost: r.total_cost.unwrap_or(Decimal::ZERO),
                count: r.count.unwrap_or(0),
            })
            .collect())
    }

    /// Get distribution of assets by condition
    pub async fn get_asset_condition_distribution(
        &self,
    ) -> DomainResult<Vec<ConditionDistribution>> {
        let rows = sqlx::query!(
            r#"
            SELECT 
                COALESCE(ac.name, 'Unknown') as condition_name,
                COUNT(a.id) as count,
                COALESCE(SUM(a.purchase_price), 0) as total_value
            FROM assets a
            LEFT JOIN asset_conditions ac ON a.condition_id = ac.id
            GROUP BY ac.name
            ORDER BY count DESC
            "#
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::ExternalServiceError {
            service: "db".into(),
            message: e.to_string(),
        })?;

        Ok(rows
            .into_iter()
            .map(|r| ConditionDistribution {
                condition: r.condition_name.unwrap_or_else(|| "Unknown".to_string()),
                count: r.count.unwrap_or(0),
                total_value: r.total_value.unwrap_or(Decimal::ZERO),
            })
            .collect())
    }

    /// Get distribution of assets by status (lifecycle)
    pub async fn get_asset_status_distribution(&self) -> DomainResult<Vec<ConditionDistribution>> {
        let rows = sqlx::query!(
            r#"
            SELECT 
                status,
                COUNT(id) as count,
                COALESCE(SUM(purchase_price), 0) as total_value
            FROM assets
            WHERE status != 'archived'
            GROUP BY status
            ORDER BY count DESC
            "#
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::ExternalServiceError {
            service: "db".into(),
            message: e.to_string(),
        })?;

        // Normalize and aggregate
        let mut normalization_map: std::collections::HashMap<String, (i64, Decimal)> =
            std::collections::HashMap::new();

        for row in rows {
            let raw_status = row.status.unwrap_or_else(|| "Unknown".to_string());
            let count = row.count.unwrap_or(0);
            let value = row.total_value.unwrap_or(Decimal::ZERO);

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

        // Sort by count descending
        result.sort_by(|a, b| b.count.cmp(&a.count));

        Ok(result)
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
            FROM rental_billing_periods rbp
            JOIN rental_items ri ON rbp.rental_item_id = ri.id
            WHERE ri.asset_id = $1
            AND rbp.status IN ('approved', 'invoiced', 'paid')"#,
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
            utilization_days: revenue.utilization_days.unwrap_or(0),
        })
    }
}
