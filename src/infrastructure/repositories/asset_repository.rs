//! Asset Repository
//!
//! Data access for Asset entities.

use sqlx::PgPool;
use uuid::Uuid;

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
                is_rental, asset_class, status, condition_id,
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
        #[derive(sqlx::FromRow)]
        struct AssetDetailRow {
            #[sqlx(flatten)]
            asset: Asset,
            category_name: Option<String>,
            location_name: Option<String>,
            department_name: Option<String>,
            department_manager_name: Option<String>,
            assigned_to_name: Option<String>,
            vendor_name: Option<String>,
            total_maintenance_cost: Option<rust_decimal::Decimal>,
            total_rental_income: Option<rust_decimal::Decimal>,
        }

        let row = sqlx::query_as::<_, AssetDetailRow>(
            r#"
            SELECT 
                a.id, a.asset_code, a.name, a.category_id, a.location_id, a.department_id, a.department, a.assigned_to, a.vendor_id,
                a.is_rental, a.asset_class, a.status, a.condition_id,
                a.serial_number, a.brand, a.model, a.year_manufacture,
                a.specifications,
                a.purchase_date, a.purchase_price, a.currency_id, a.unit_id, a.quantity,
                a.residual_value, a.useful_life_months,
                a.qr_code_url, a.notes,
                a.created_at, a.updated_at,
                c.name as category_name,
                l.name as location_name,
                d.name as department_name,
                m.name as department_manager_name,
                u.name as assigned_to_name,
                v.name as vendor_name,
                (
                    SELECT COALESCE(SUM(actual_cost), 0)
                    FROM maintenance_work_orders 
                    WHERE asset_id = a.id AND status ILIKE 'completed'
                ) as total_maintenance_cost,
                (
                    SELECT COALESCE(SUM(total_amount), 0)
                    FROM rentals 
                    WHERE asset_id = a.id AND status ILIKE 'returned'
                ) as total_rental_income
            FROM assets a
            LEFT JOIN categories c ON a.category_id = c.id
            LEFT JOIN locations l ON a.location_id = l.id
            LEFT JOIN departments d ON a.department_id = d.id
            LEFT JOIN employees m ON m.department_id = d.id AND m.is_manager = true
            LEFT JOIN users u ON a.assigned_to = u.id
            LEFT JOIN vendors v ON a.vendor_id = v.id
            WHERE a.id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(r) = row {
            let vehicle = self.get_vehicle_details(id).await?;
            Ok(Some((
                r.asset,
                r.category_name,
                r.location_name,
                r.department_name,
                r.department_manager_name,
                r.assigned_to_name,
                r.vendor_name,
                vehicle,
                r.total_maintenance_cost,
                r.total_rental_income,
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
                is_rental, asset_class, status, condition_id,
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
            SELECT a.id, a.asset_code, a.name, a.status, a.asset_class, a.is_rental, a.brand, a.purchase_price, 
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
                is_rental, asset_class, status, condition_id,
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
        limit: i64,
        offset: i64,
    ) -> Result<Vec<AssetSummary>, sqlx::Error> {
        sqlx::query_as::<_, AssetSummary>(
            r#"
            SELECT a.id, a.asset_code, a.name, a.status, a.asset_class, a.is_rental, a.brand, a.purchase_price, 
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
        .fetch_all(&self.pool)
        .await
    }

    /// Create new asset
    pub async fn create(&self, asset: &Asset) -> Result<Asset, sqlx::Error> {
        sqlx::query_as::<_, Asset>(
            r#"
            INSERT INTO assets (
                id, asset_code, name, category_id, location_id, department_id, department, assigned_to, vendor_id,
                is_rental, asset_class, status, condition_id,
                serial_number, brand, model, year_manufacture,
                specifications,
                purchase_date, purchase_price, currency_id, unit_id, quantity,
                residual_value, useful_life_months,
                qr_code_url, notes
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
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
                is_rental = $10, asset_class = $11, status = $12, condition_id = $13,
                serial_number = $14, brand = $15, model = $16, year_manufacture = $17,
                specifications = $18,
                purchase_date = $19, purchase_price = $20, currency_id = $21, unit_id = $22, quantity = $23,
                residual_value = $24, useful_life_months = $25,
                qr_code_url = $26, notes = $27,
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

    /// Upsert vehicle details
    pub async fn upsert_vehicle_details(
        &self,
        details: &VehicleDetails,
    ) -> Result<VehicleDetails, sqlx::Error> {
        sqlx::query_as::<_, VehicleDetails>(
            r#"
            INSERT INTO vehicle_details (
                asset_id, license_plate, brand, model, color, vin, engine_number,
                bpkb_number, stnk_expiry, kir_expiry, tax_expiry,
                fuel_type, transmission, capacity, odometer_last
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            ON CONFLICT (asset_id) DO UPDATE SET
                license_plate = EXCLUDED.license_plate,
                brand = EXCLUDED.brand,
                model = EXCLUDED.model,
                color = EXCLUDED.color,
                vin = EXCLUDED.vin,
                engine_number = EXCLUDED.engine_number,
                bpkb_number = EXCLUDED.bpkb_number,
                stnk_expiry = EXCLUDED.stnk_expiry,
                kir_expiry = EXCLUDED.kir_expiry,
                tax_expiry = EXCLUDED.tax_expiry,
                fuel_type = EXCLUDED.fuel_type,
                transmission = EXCLUDED.transmission,
                capacity = EXCLUDED.capacity,
                odometer_last = EXCLUDED.odometer_last,
                updated_at = NOW()
            RETURNING *
            "#,
        )
        .bind(details.asset_id)
        .bind(&details.license_plate)
        .bind(&details.brand)
        .bind(&details.model)
        .bind(&details.color)
        .bind(&details.vin)
        .bind(&details.engine_number)
        .bind(&details.bpkb_number)
        .bind(details.stnk_expiry)
        .bind(details.kir_expiry)
        .bind(details.tax_expiry)
        .bind(&details.fuel_type)
        .bind(&details.transmission)
        .bind(&details.capacity)
        .bind(details.odometer_last)
        .fetch_one(&self.pool)
        .await
    }

    /// Get vehicle details
    pub async fn get_vehicle_details(
        &self,
        asset_id: Uuid,
    ) -> Result<Option<VehicleDetails>, sqlx::Error> {
        sqlx::query_as::<_, VehicleDetails>("SELECT * FROM vehicle_details WHERE asset_id = $1")
            .bind(asset_id)
            .fetch_optional(&self.pool)
            .await
    }

    /// Update odometer
    pub async fn update_odometer(&self, asset_id: Uuid, reading: i32) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            "UPDATE vehicle_details SET odometer_last = $2, updated_at = NOW() WHERE asset_id = $1",
        )
        .bind(asset_id)
        .bind(reading)
        .execute(&self.pool)
        .await?;
        Ok(result.rows_affected() > 0)
    }
}
