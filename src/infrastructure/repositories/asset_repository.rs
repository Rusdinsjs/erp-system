//! Asset Repository
//!
//! Data access for Asset entities.

use sqlx::PgPool;
use uuid::Uuid;

use crate::domain::entities::analytics::AssetStatusStats;
use crate::domain::entities::asset_details::VehicleDetails;
use crate::domain::entities::{Asset, AssetHistory, AssetSummary};

/// Asset repository
#[derive(Clone)]
pub struct AssetRepository {
    pool: PgPool,
}

impl AssetRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Find asset by ID
    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Asset>, sqlx::Error> {
        sqlx::query_as::<_, Asset>(
            r#"
            SELECT 
                id, asset_code, name, category_id, location_id, department_id, department, assigned_to, vendor_id,
                is_rental, is_fuel, is_loan, asset_class, status, condition_id,
                serial_number, brand, model, year_manufacture,
                specifications,
                purchase_date, purchase_price, currency_id, unit_id, quantity,
                residual_value, useful_life_months,
                qr_code_url, notes,
                created_at, updated_at
            FROM assets
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
    }

    /// Find asset detail by ID (with joins)
    pub async fn find_detail_by_id(
        &self,
        id: Uuid,
    ) -> Result<
        Option<(
            Asset,
            Option<String>,
            Option<String>,
            Option<String>,
            Option<String>,
            Option<String>,
            Option<String>,
            Option<VehicleDetails>,
            Option<rust_decimal::Decimal>,
            Option<rust_decimal::Decimal>,
        )>,
        sqlx::Error,
    > {
        use sqlx::Row;

        // 1. Fetch Asset Details (SAFE Joins Only)
        let row = sqlx::query(
            r#"
            SELECT 
                a.id, a.asset_code, a.name, a.category_id, a.location_id, a.department_id, a.department, a.assigned_to, a.vendor_id,
                a.is_rental, a.is_fuel, a.is_loan, a.asset_class, a.status, a.condition_id,
                a.serial_number, a.brand, a.model, a.year_manufacture,
                a.specifications,
                a.purchase_date, a.purchase_price, a.currency_id, a.unit_id, a.quantity,
                a.residual_value, a.useful_life_months,
                a.qr_code_url, a.notes,
                a.created_at, a.updated_at,
                (SELECT row_to_json(vd) FROM vehicle_details vd WHERE vd.asset_id = a.id) as vehicle_details,
                c.name as category_name,
                l.name as location_name,
                d.name as department_name,
                u.name as assigned_to_name,
                v.name as vendor_name
            FROM assets a
            LEFT JOIN categories c ON a.category_id = c.id
            LEFT JOIN locations l ON a.location_id = l.id
            LEFT JOIN departments d ON a.department_id = d.id
            LEFT JOIN users u ON a.assigned_to = u.id
            LEFT JOIN vendors v ON a.vendor_id = v.id
            WHERE a.id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(r) = row {
            // 2. Fetch Aggregates (Maintenance Cost & Rental Income) in a separate query
            //    Using raw query() instead of query_as() to avoid mapping issues with anonymous columns
            let stats_row = sqlx::query(
                r#"
                SELECT 
                    (SELECT COALESCE(SUM(actual_cost), 0) FROM maintenance_work_orders WHERE asset_id = $1 AND status ILIKE 'completed') as maint_cost,
                    (SELECT COALESCE(SUM(total_amount), 0) FROM rentals WHERE asset_id = $1 AND status ILIKE 'returned') as rental_income
                "#
            )
            .bind(id)
            .fetch_one(&self.pool)
            .await
            .ok(); // Convert Result to Option to be safe, though fetch_one usually errors if no row

            let (total_maintenance_cost, total_rental_income) = if let Some(s) = stats_row {
                (
                    s.try_get::<rust_decimal::Decimal, _>(0)
                        .unwrap_or(rust_decimal::Decimal::ZERO),
                    s.try_get::<rust_decimal::Decimal, _>(1)
                        .unwrap_or(rust_decimal::Decimal::ZERO),
                )
            } else {
                (rust_decimal::Decimal::ZERO, rust_decimal::Decimal::ZERO)
            };

            // Manual mapping from Row to Asset struct
            let asset = Asset {
                id: r.get("id"),
                asset_code: r.get("asset_code"),
                name: r.get("name"),
                category_id: r.get("category_id"),
                location_id: r.get("location_id"),
                department_id: r.get("department_id"),
                department: r.get("department"),
                assigned_to: r.get("assigned_to"),
                vendor_id: r.get("vendor_id"),
                is_rental: r.get::<bool, _>("is_rental"),
                is_fuel: r.get::<bool, _>("is_fuel"),
                is_loan: r.get::<bool, _>("is_loan"),
                asset_class: r.get("asset_class"),
                status: r.get("status"),
                condition_id: r.get("condition_id"),
                serial_number: r.get("serial_number"),
                brand: r.get("brand"),
                model: r.get("model"),
                year_manufacture: r.get("year_manufacture"),
                specifications: r.get("specifications"),
                purchase_date: r.get("purchase_date"),
                purchase_price: r.get("purchase_price"),
                currency_id: r.get("currency_id"),
                unit_id: r.get("unit_id"),
                quantity: r.get("quantity"),
                residual_value: r.get("residual_value"),
                useful_life_months: r.get("useful_life_months"),
                qr_code_url: r.get("qr_code_url"),
                notes: r.get("notes"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            };

            // Parse vehicle_details JSONB
            let vehicle_json: Option<serde_json::Value> = r.get("vehicle_details");
            let vehicle = vehicle_json.and_then(|json| {
                serde_json::from_value::<VehicleDetails>(json)
                    .ok()
                    .map(|mut v| {
                        v.asset_id = id;
                        v
                    })
            });

            let category_name: Option<String> = r.get("category_name");
            let location_name: Option<String> = r.get("location_name");
            let department_name: Option<String> = r.get("department_name");
            let assigned_to_name: Option<String> = r.get("assigned_to_name");
            let vendor_name: Option<String> = r.get("vendor_name");

            Ok(Some((
                asset,
                category_name,
                location_name,
                department_name,
                None, // department_manager_name - removed for now
                assigned_to_name,
                vendor_name,
                vehicle,
                Some(total_maintenance_cost),
                Some(total_rental_income),
            )))
        } else {
            Ok(None)
        }
    }

    /// Find asset by code
    pub async fn find_by_code(&self, code: &str) -> Result<Option<Asset>, sqlx::Error> {
        sqlx::query_as::<_, Asset>(
            r#"
            SELECT 
                id, asset_code, name, category_id, location_id, department_id, department, assigned_to, vendor_id,
                is_rental, is_fuel, is_loan, asset_class, status, condition_id,
                serial_number, brand, model, year_manufacture,
                specifications,
                purchase_date, purchase_price, currency_id, unit_id, quantity,
                residual_value, useful_life_months,
                qr_code_url, notes,
                created_at, updated_at
            FROM assets
            WHERE asset_code = $1
            "#,
        )
        .bind(code)
        .fetch_optional(&self.pool)
        .await
    }

    /// List assets with pagination and optional department filter (excludes archived)
    pub async fn list(
        &self,
        limit: i64,
        offset: i64,
        department: Option<&str>,
    ) -> Result<Vec<AssetSummary>, sqlx::Error> {
        sqlx::query_as::<_, AssetSummary>(
            r#"
            SELECT a.id, a.asset_code, a.name, a.status, a.asset_class, a.is_rental, a.is_fuel, a.is_loan, a.brand, a.purchase_price, 
                   a.category_id, a.location_id, l.name as location_name, COALESCE(d.name, a.department) as department, a.department_id, a.model, a.serial_number
            FROM assets a
            LEFT JOIN locations l ON a.location_id = l.id
            LEFT JOIN departments d ON a.department_id = d.id
            WHERE a.status != 'archived'
              AND ($3::text IS NULL OR a.department = $3 OR d.name = $3)
            ORDER BY a.created_at DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit)
        .bind(offset)
        .bind(department)
        .fetch_all(&self.pool)
        .await
    }

    /// Find all non-archived assets (for export)
    pub async fn find_all(&self) -> Result<Vec<Asset>, sqlx::Error> {
        sqlx::query_as::<_, Asset>(
            r#"
            SELECT 
                id, asset_code, name, category_id, location_id, department_id, department, assigned_to, vendor_id,
                is_rental, is_fuel, is_loan, asset_class, status, condition_id,
                serial_number, brand, model, year_manufacture,
                specifications,
                purchase_date, purchase_price, currency_id, unit_id, quantity,
                residual_value, useful_life_months,
                qr_code_url, notes,
                created_at, updated_at
            FROM assets
            WHERE status != 'archived'
            ORDER BY created_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await
    }

    /// Count total non-archived assets
    pub async fn count(&self) -> Result<i64, sqlx::Error> {
        let result: (i64,) =
            sqlx::query_as("SELECT COUNT(*) FROM assets WHERE status != 'archived'")
                .fetch_one(&self.pool)
                .await?;
        Ok(result.0)
    }

    /// Search assets (excludes archived unless explicitly requested)
    pub async fn search(
        &self,
        query: &str,
        category_id: Option<Uuid>,
        location_id: Option<Uuid>,
        department: Option<&str>,
        status: Option<&str>,
        is_fuel: Option<bool>,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<AssetSummary>, sqlx::Error> {
        sqlx::query_as::<_, AssetSummary>(
            r#"
            SELECT a.id, a.asset_code, a.name, a.status, a.asset_class, a.is_rental, a.is_fuel, a.is_loan, a.brand, a.purchase_price, 
                   a.category_id, a.location_id, l.name as location_name, COALESCE(d.name, a.department) as department, a.department_id, a.model, a.serial_number
            FROM assets a
            LEFT JOIN locations l ON a.location_id = l.id
            LEFT JOIN departments d ON a.department_id = d.id
            WHERE 
                ($1 = '' OR a.name ILIKE '%' || $1 || '%' OR a.asset_code ILIKE '%' || $1 || '%' OR a.serial_number ILIKE '%' || $1 || '%')
                AND ($2::uuid IS NULL OR a.category_id = $2)
                AND ($3::uuid IS NULL OR a.location_id = $3)
                AND ($4::text IS NULL OR a.department = $4 OR d.name = $4)
                AND (($5::text IS NOT NULL AND a.status = $5) OR ($5::text IS NULL AND a.status != 'archived'))
                AND ($8::boolean IS NULL OR a.is_fuel = $8)
            ORDER BY a.created_at DESC
            LIMIT $6 OFFSET $7
            "#,
        )
        .bind(query)
        .bind(category_id)
        .bind(location_id)
        .bind(department)
        .bind(status)
        .bind(limit)
        .bind(offset)
        .bind(is_fuel)
        .fetch_all(&self.pool)
        .await
    }

    /// Create new asset
    pub async fn create(&self, asset: &Asset) -> Result<Asset, sqlx::Error> {
        sqlx::query_as::<_, Asset>(
            r#"
            INSERT INTO assets (
                id, asset_code, name, category_id, location_id, department_id, department, assigned_to, vendor_id,
                is_rental, is_fuel, is_loan, asset_class, status, condition_id,
                serial_number, brand, model, year_manufacture,
                specifications,
                purchase_date, purchase_price, currency_id, unit_id, quantity,
                residual_value, useful_life_months,
                qr_code_url, notes
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
            RETURNING *
            "#,
        )
        .bind(asset.id)
        .bind(&asset.asset_code)
        .bind(&asset.name)
        .bind(asset.category_id)
        .bind(asset.location_id)
        .bind(asset.department_id)
        .bind(&asset.department)
        .bind(asset.assigned_to)
        .bind(asset.vendor_id)
        .bind(asset.is_rental)
        .bind(asset.is_fuel)
        .bind(asset.is_loan)
        .bind(&asset.asset_class)
        .bind(&asset.status)
        .bind(asset.condition_id)
        .bind(&asset.serial_number)
        .bind(&asset.brand)
        .bind(&asset.model)
        .bind(asset.year_manufacture)
        .bind(&asset.specifications)
        .bind(asset.purchase_date)
        .bind(asset.purchase_price)
        .bind(asset.currency_id)
        .bind(asset.unit_id)
        .bind(asset.quantity)
        .bind(asset.residual_value)
        .bind(asset.useful_life_months)
        .bind(&asset.qr_code_url)
        .bind(&asset.notes)
        .fetch_one(&self.pool)
        .await
    }

    /// Update asset
    pub async fn update(&self, asset: &Asset) -> Result<Asset, sqlx::Error> {
        sqlx::query_as::<_, Asset>(
            r#"
            UPDATE assets SET
                asset_code = $2, name = $3, category_id = $4, location_id = $5,
                department_id = $6, department = $7, assigned_to = $8, vendor_id = $9,
                is_rental = $10, is_fuel = $11, is_loan = $12, asset_class = $13, status = $14, condition_id = $15,
                serial_number = $16, brand = $17, model = $18, year_manufacture = $19,
                specifications = $20,
                purchase_date = $21, purchase_price = $22, currency_id = $23, unit_id = $24, quantity = $25,
                residual_value = $26, useful_life_months = $27,
                qr_code_url = $28, notes = $29,
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(asset.id)
        .bind(&asset.asset_code)
        .bind(&asset.name)
        .bind(asset.category_id)
        .bind(asset.location_id)
        .bind(asset.department_id)
        .bind(&asset.department)
        .bind(asset.assigned_to)
        .bind(asset.vendor_id)
        .bind(asset.is_rental)
        .bind(asset.is_fuel)
        .bind(asset.is_loan)
        .bind(&asset.asset_class)
        .bind(&asset.status)
        .bind(asset.condition_id)
        .bind(&asset.serial_number)
        .bind(&asset.brand)
        .bind(&asset.model)
        .bind(asset.year_manufacture)
        .bind(&asset.specifications)
        .bind(asset.purchase_date)
        .bind(asset.purchase_price)
        .bind(asset.currency_id)
        .bind(asset.unit_id)
        .bind(asset.quantity)
        .bind(asset.residual_value)
        .bind(asset.useful_life_months)
        .bind(&asset.qr_code_url)
        .bind(&asset.notes)
        .fetch_one(&self.pool)
        .await
    }

    /// Update asset status
    pub async fn update_status(&self, id: Uuid, status: &str) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("UPDATE assets SET status = $2, updated_at = NOW() WHERE id = $1")
            .bind(id)
            .bind(status)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Update asset location
    pub async fn update_location(&self, id: Uuid, location_id: Uuid) -> Result<bool, sqlx::Error> {
        let result =
            sqlx::query("UPDATE assets SET location_id = $2, updated_at = NOW() WHERE id = $1")
                .bind(id)
                .bind(location_id)
                .execute(&self.pool)
                .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Delete asset (Soft Delete - Archive)
    pub async fn delete(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let result =
            sqlx::query("UPDATE assets SET status = 'archived', updated_at = NOW() WHERE id = $1")
                .bind(id)
                .execute(&self.pool)
                .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Get asset history
    pub async fn get_history(&self, asset_id: Uuid) -> Result<Vec<AssetHistory>, sqlx::Error> {
        sqlx::query_as::<_, AssetHistory>(
            r#"
            SELECT id, asset_id, action, from_location_id, to_location_id,
                   from_user_id, to_user_id, notes, performed_by, created_at
            FROM asset_history
            WHERE asset_id = $1
            ORDER BY created_at DESC
            "#,
        )
        .bind(asset_id)
        .fetch_all(&self.pool)
        .await
    }

    /// Add history entry
    pub async fn add_history(&self, history: &AssetHistory) -> Result<AssetHistory, sqlx::Error> {
        sqlx::query_as::<_, AssetHistory>(
            r#"
            INSERT INTO asset_history (id, asset_id, action, from_location_id, to_location_id,
                                       from_user_id, to_user_id, notes, performed_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
            "#,
        )
        .bind(history.id)
        .bind(history.asset_id)
        .bind(&history.action)
        .bind(history.from_location_id)
        .bind(history.to_location_id)
        .bind(history.from_user_id)
        .bind(history.to_user_id)
        .bind(&history.notes)
        .bind(history.performed_by)
        .fetch_one(&self.pool)
        .await
    }

    /// Upsert vehicle details (Update asset JSONB)
    pub async fn upsert_vehicle_details(
        &self,
        details: &VehicleDetails,
    ) -> Result<VehicleDetails, sqlx::Error> {
        let json = serde_json::to_value(details)
            .map_err(|e| sqlx::Error::Protocol(e.to_string().into()))?;

        sqlx::query("UPDATE assets SET vehicle_details = $2, updated_at = NOW() WHERE id = $1")
            .bind(details.asset_id)
            .bind(json)
            .execute(&self.pool)
            .await?;

        Ok(details.clone())
    }

    /// Get vehicle details
    pub async fn get_vehicle_details(
        &self,
        asset_id: Uuid,
    ) -> Result<Option<VehicleDetails>, sqlx::Error> {
        let row: Option<(sqlx::types::Json<VehicleDetails>,)> =
            sqlx::query_as("SELECT vehicle_details FROM assets WHERE id = $1")
                .bind(asset_id)
                .fetch_optional(&self.pool)
                .await?;

        if let Some((json,)) = row {
            let mut v = json.0;
            v.asset_id = asset_id;
            Ok(Some(v))
        } else {
            Ok(None)
        }
    }

    /// Update odometer (Partial JSONB update)
    pub async fn update_odometer(&self, asset_id: Uuid, reading: i32) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            "UPDATE assets SET vehicle_details = COALESCE(vehicle_details, '{}'::jsonb) || jsonb_build_object('odometer_last', $2::bigint, 'updated_at', NOW()), updated_at = NOW() WHERE id = $1",
        )
        .bind(asset_id)
        .bind(reading)
        .execute(&self.pool)
        .await?;
        Ok(result.rows_affected() > 0)
    }

    pub async fn get_status_distribution(&self) -> Result<Vec<AssetStatusStats>, sqlx::Error> {
        sqlx::query_as::<_, AssetStatusStats>(
            r#"
            SELECT status, COUNT(*) as count
            FROM assets
            WHERE status != 'archived'
            GROUP BY status
            ORDER BY count DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await
    }
}
