//! Asset Repository
//!
//! Data access for Asset entities.

use sqlx::PgPool;
use uuid::Uuid;

use crate::domain::entities::analytics::AssetStatusStats;
use crate::domain::entities::asset_details::VehicleDetails;
use crate::domain::entities::{Asset, AssetDocument, AssetHistory, AssetSummary};
use chrono::NaiveDate;

/// Asset repository
#[derive(Clone)]
pub struct AssetRepository {
    pool: PgPool,
}

impl AssetRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    /// Find asset by ID
    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Asset>, sqlx::Error> {
        sqlx::query_as::<_, Asset>(
            r#"
            SELECT 
                id, asset_code, name, category_id, location_id, department_id, department, assigned_to, vendor_id,
                is_rental, is_fuel, is_loan, asset_class, status, condition_id,
                serial_number, brand, model, year_manufacture,
                specifications, description, acquisition_method, funding_source,
                purchase_date, purchase_price, currency_id, unit_id, quantity,
                residual_value, useful_life_months,
                qr_code_url, notes,
                sale_price, sale_date, sold_to,
                created_at, updated_at, version
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
    ) -> Result<Option<crate::domain::entities::asset::AssetDetail>, sqlx::Error> {
        use sqlx::Row;

        // 1. Fetch Asset Details (SAFE Joins Only)
        let row = sqlx::query(
            r#"
            SELECT 
                a.id, a.asset_code, a.name, a.category_id, a.location_id, a.department_id, a.department, a.assigned_to, a.vendor_id,
                a.is_rental, a.is_fuel, a.is_loan, a.asset_class, a.status, a.condition_id,
                a.serial_number, a.brand, a.model, a.year_manufacture,
                a.specifications, a.description, a.acquisition_method, a.funding_source,
                a.purchase_date, a.purchase_price, a.currency_id, a.unit_id, a.quantity,
                a.residual_value, a.useful_life_months,
                a.qr_code_url, a.notes,
                a.sale_price, a.sale_date, a.sold_to,
                a.created_at, a.updated_at, a.version,
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

                sale_price: r.get("sale_price"),
                sale_date: r.get("sale_date"),
                sold_to: r.get("sold_to"),
                specifications: r.get("specifications"),
                description: r.get("description"),
                acquisition_method: r.get("acquisition_method"),
                funding_source: r.get("funding_source"),
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
                version: r.get("version"),
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

            // Fetch additional details
            let land_details = sqlx::query_as::<_, crate::domain::entities::asset_details::LandDetails>("SELECT * FROM land_details WHERE asset_id = $1")
                .bind(id)
                .fetch_optional(&self.pool)
                .await?;

            let building_details = sqlx::query_as::<_, crate::domain::entities::asset_details::BuildingDetails>("SELECT * FROM building_details WHERE asset_id = $1")
                .bind(id)
                .fetch_optional(&self.pool)
                .await?;

            let heavy_equipment_details = sqlx::query_as::<_, crate::domain::entities::asset_details::HeavyEquipmentDetails>("SELECT * FROM heavy_equipment_details WHERE asset_id = $1")
                .bind(id)
                .fetch_optional(&self.pool)
                .await?;

            let machine_details = sqlx::query_as::<_, crate::domain::entities::asset_details::MachineDetails>("SELECT * FROM machine_details WHERE asset_id = $1")
                .bind(id)
                .fetch_optional(&self.pool)
                .await?;

            let inventory_details = sqlx::query_as::<_, crate::domain::entities::asset_details::InventoryDetails>("SELECT * FROM inventory_details WHERE asset_id = $1")
                .bind(id)
                .fetch_optional(&self.pool)
                .await?;

            let furniture_details = sqlx::query_as::<_, crate::domain::entities::asset_details::FurnitureDetails>("SELECT * FROM furniture_details WHERE asset_id = $1")
                .bind(id)
                .fetch_optional(&self.pool)
                .await?;

            Ok(Some(crate::domain::entities::asset::AssetDetail {
                asset,
                category_name,
                location_name,
                department_name,
                department_manager_name: None, // department_manager_name - removed for now
                assigned_to_name,
                vendor_name,
                condition_name: None,
                vehicle_details: vehicle,
                land_details,
                building_details,
                heavy_equipment_details,
                machine_details,
                inventory_details,
                furniture_details,
                total_maintenance_cost: Some(total_maintenance_cost),
                total_rental_income: Some(total_rental_income),
            }))
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
                specifications, description, acquisition_method, funding_source,
                purchase_date, purchase_price, currency_id, unit_id, quantity,
                residual_value, useful_life_months,
                qr_code_url, notes,
                sale_price, sale_date, sold_to,
                created_at, updated_at, version
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
        asset_group: Option<&str>,
    ) -> Result<Vec<AssetSummary>, sqlx::Error> {
        sqlx::query_as::<_, AssetSummary>(
            r#"
            SELECT a.id, a.asset_code, a.name, a.status, a.asset_class, a.is_rental, a.is_fuel, a.is_loan, a.brand, a.purchase_price, 
                   a.category_id, c.name as category_name, a.location_id, l.name as location_name, COALESCE(d.name, a.department) as department, a.department_id, a.model, a.serial_number, 
                   a.assigned_to, u.name as assigned_to_name, a.version,
                   (SELECT file_path FROM asset_documents WHERE asset_id = a.id AND (type IN ('FRONT', 'BACK', 'LEFT', 'RIGHT', 'PHOTO', 'main') OR mime_type ILIKE 'image/%') ORDER BY CASE WHEN type = 'FRONT' THEN 1 WHEN type = 'PHOTO' THEN 2 ELSE 3 END, created_at DESC LIMIT 1) as photo_url
            FROM assets a
            LEFT JOIN categories c ON a.category_id = c.id
            LEFT JOIN locations l ON a.location_id = l.id
            LEFT JOIN departments d ON a.department_id = d.id
            LEFT JOIN users u ON a.assigned_to = u.id
            WHERE a.status != 'archived'
              AND ($3::text IS NULL OR a.department = $3 OR d.name = $3)
              AND ($4::text IS NULL OR c.asset_group = $4)
            ORDER BY a.created_at DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit)
        .bind(offset)
        .bind(department)
        .bind(asset_group)
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
                specifications, description, acquisition_method, funding_source,
                purchase_date, purchase_price, currency_id, unit_id, quantity,
                residual_value, useful_life_months,
                qr_code_url, notes,
                sale_price, sale_date, sold_to,
                created_at, updated_at, version
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
    #[allow(clippy::too_many_arguments)]
    pub async fn search(
        &self,
        query: &str,
        category_id: Option<&str>,
        location_id: Option<&str>,
        department: Option<&str>,
        status: Option<&str>,
        is_fuel: Option<bool>,
        limit: i64,
        offset: i64,
        exact_match: bool,
        sort_by: Option<&str>,
        sort_order: Option<&str>,
        asset_group: Option<&str>,
    ) -> Result<Vec<AssetSummary>, sqlx::Error> {
        let order_by = match sort_by.unwrap_or("created_at") {
            "name" => "a.name",
            "asset_code" => "a.asset_code",
            "status" => "a.status",
            "purchase_price" => "a.purchase_price",
            "created_at" => "a.created_at",
            "brand" => "a.brand",
            "model" => "a.model",
            "serial_number" => "a.serial_number",
            _ => "a.created_at",
        };

        let direction = if sort_order.unwrap_or("desc").to_lowercase() == "asc" {
            "ASC"
        } else {
            "DESC"
        };

        let sql = format!(
            r#"
            SELECT a.id, a.asset_code, a.name, a.status, a.asset_class, a.is_rental, a.is_fuel, a.is_loan, a.brand, a.purchase_price, 
                   a.category_id, c.name as category_name, a.location_id, l.name as location_name, COALESCE(d.name, a.department) as department, a.department_id, a.model, a.serial_number, 
                   a.assigned_to, u.name as assigned_to_name, a.version,
                   (SELECT file_path FROM asset_documents WHERE asset_id = a.id AND (type IN ('FRONT', 'BACK', 'LEFT', 'RIGHT', 'PHOTO', 'main') OR mime_type ILIKE 'image/%') ORDER BY CASE WHEN type = 'FRONT' THEN 1 WHEN type = 'PHOTO' THEN 2 ELSE 3 END, created_at DESC LIMIT 1) as photo_url
            FROM assets a
            LEFT JOIN categories c ON a.category_id = c.id
            LEFT JOIN locations l ON a.location_id = l.id
            LEFT JOIN departments d ON a.department_id = d.id
            LEFT JOIN users u ON a.assigned_to = u.id
            WHERE 
                (
                    CASE 
                        WHEN $9 THEN (a.name = $1 OR a.asset_code = $1 OR a.serial_number = $1 OR a.brand = $1 OR a.model = $1)
                        ELSE ($1 = '' OR a.name ILIKE '%' || $1 || '%' OR a.asset_code ILIKE '%' || $1 || '%' OR a.serial_number ILIKE '%' || $1 || '%' OR a.brand ILIKE '%' || $1 || '%' OR a.model ILIKE '%' || $1 || '%' OR a.notes ILIKE '%' || $1 || '%')
                    END
                )
                AND ($2::text IS NULL OR a.category_id = ANY(string_to_array($2, ',')::uuid[]))
                AND ($3::text IS NULL OR a.location_id = ANY(string_to_array($3, ',')::uuid[]))
                AND ($4::text IS NULL OR a.department = ANY(string_to_array($4, ',')) OR d.name = ANY(string_to_array($4, ',')))
                AND (
                    ($5::text IS NULL AND a.status != 'archived')
                    OR ($5::text IS NOT NULL AND (
                        a.status = ANY(string_to_array($5, ','))
                        OR (
                            'active' = ANY(string_to_array($5, ','))
                            AND a.status NOT IN ('archived', 'maintenance', 'under_maintenance', 'under_repair', 'under_conversion', 'retired', 'disposed', 'planning', 'lost_stolen')
                        )
                    ))
                )
                AND ($8::boolean IS NULL OR a.is_fuel = $8)
                AND ($10::text IS NULL OR c.asset_group = $10)
            ORDER BY {} {}
            LIMIT $6 OFFSET $7
            "#,
            order_by, direction
        );

        sqlx::query_as::<_, AssetSummary>(&sql)
            .bind(query)
            .bind(category_id)
            .bind(location_id)
            .bind(department)
            .bind(status)
            .bind(limit)
            .bind(offset)
            .bind(is_fuel)
            .bind(exact_match)
            .bind(asset_group)
            .fetch_all(&self.pool)
            .await
    }

    /// Create new asset
    pub async fn create(&self, asset: &Asset) -> Result<Asset, sqlx::Error> {
        let mut conn = self.pool.acquire().await?;
        self.create_with_executor(&mut conn, asset).await
    }

    pub async fn create_with_executor(
        &self,
        executor: &mut sqlx::PgConnection,
        asset: &Asset,
    ) -> Result<Asset, sqlx::Error> {
        sqlx::query_as::<_, Asset>(
            r#"
            INSERT INTO assets (
                id, asset_code, name, category_id, location_id, department_id, department, assigned_to, vendor_id,
                is_rental, is_fuel, is_loan, asset_class, status, condition_id,
                serial_number, brand, model, year_manufacture,
                specifications,
                description, acquisition_method, funding_source,
                purchase_date, purchase_price, currency_id, unit_id, quantity,
                residual_value, useful_life_months,
                qr_code_url, notes,
                sale_price, sale_date, sold_to
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35)
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
        .bind(&asset.description)
        .bind(&asset.acquisition_method)
        .bind(&asset.funding_source)
        .bind(asset.purchase_date)
        .bind(asset.purchase_price)
        .bind(asset.currency_id)
        .bind(asset.unit_id)
        .bind(asset.quantity)
        .bind(asset.residual_value)
        .bind(asset.useful_life_months)
        .bind(&asset.qr_code_url)
        .bind(&asset.notes)
        .bind(asset.sale_price)
        .bind(asset.sale_date)
        .bind(&asset.sold_to)
        .fetch_one(executor)
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
                description = $21, acquisition_method = $22, funding_source = $23,
                purchase_date = $24, purchase_price = $25, currency_id = $26, unit_id = $27, quantity = $28,
                residual_value = $29, useful_life_months = $30,
                qr_code_url = $31, notes = $32,
                sale_price = $33, sale_date = $34, sold_to = $35,
                updated_at = NOW(),
                version = version + 1
            WHERE id = $1 AND version = $36
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
        .bind(&asset.description)
        .bind(&asset.acquisition_method)
        .bind(&asset.funding_source)
        .bind(asset.purchase_date)
        .bind(asset.purchase_price)
        .bind(asset.currency_id)
        .bind(asset.unit_id)
        .bind(asset.quantity)
        .bind(asset.residual_value)
        .bind(asset.useful_life_months)
        .bind(&asset.qr_code_url)
        .bind(&asset.notes)
        .bind(asset.sale_price)
        .bind(asset.sale_date)
        .bind(&asset.sold_to)
        .bind(asset.version)
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

    /// Update asset category
    pub async fn update_category(&self, id: Uuid, category_id: Uuid) -> Result<bool, sqlx::Error> {
        let result =
            sqlx::query("UPDATE assets SET category_id = $2, updated_at = NOW() WHERE id = $1")
                .bind(id)
                .bind(category_id)
                .execute(&self.pool)
                .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Update asset specifications
    pub async fn update_specifications(
        &self,
        id: Uuid,
        specifications: serde_json::Value,
    ) -> Result<bool, sqlx::Error> {
        let result =
            sqlx::query("UPDATE assets SET specifications = $2, updated_at = NOW() WHERE id = $1")
                .bind(id)
                .bind(specifications)
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
        let mut conn = self.pool.acquire().await?;
        self.upsert_vehicle_details_with_executor(&mut conn, details)
            .await
    }

    pub async fn upsert_vehicle_details_with_executor(
        &self,
        executor: &mut sqlx::PgConnection,
        details: &VehicleDetails,
    ) -> Result<VehicleDetails, sqlx::Error> {
        let json =
            serde_json::to_value(details).map_err(|e| sqlx::Error::Protocol(e.to_string()))?;

        sqlx::query("UPDATE assets SET vehicle_details = $2, updated_at = NOW() WHERE id = $1")
            .bind(details.asset_id)
            .bind(json)
            .execute(executor)
            .await?;

        Ok(details.clone())
    }

    pub async fn upsert_land_details_with_executor(
        &self,
        executor: &mut sqlx::PgConnection,
        details: &crate::domain::entities::asset_details::LandDetails,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            INSERT INTO land_details (
                asset_id, certificate_number, land_area, address, zoning, 
                rights_status, rights_expiry, pbb_number, njop_value, gps_coordinates, boundaries
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (asset_id) DO UPDATE SET
                certificate_number = EXCLUDED.certificate_number,
                land_area = EXCLUDED.land_area,
                address = EXCLUDED.address,
                zoning = EXCLUDED.zoning,
                rights_status = EXCLUDED.rights_status,
                rights_expiry = EXCLUDED.rights_expiry,
                pbb_number = EXCLUDED.pbb_number,
                njop_value = EXCLUDED.njop_value,
                gps_coordinates = EXCLUDED.gps_coordinates,
                boundaries = EXCLUDED.boundaries
            "#
        )
        .bind(details.asset_id)
        .bind(&details.certificate_number)
        .bind(details.land_area)
        .bind(&details.address)
        .bind(&details.zoning)
        .bind(&details.rights_status)
        .bind(details.rights_expiry)
        .bind(&details.pbb_number)
        .bind(details.njop_value)
        .bind(&details.gps_coordinates)
        .bind(&details.boundaries)
        .execute(executor)
        .await?;
        Ok(())
    }

    pub async fn upsert_building_details_with_executor(
        &self,
        executor: &mut sqlx::PgConnection,
        details: &crate::domain::entities::asset_details::BuildingDetails,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            INSERT INTO building_details (
                asset_id, land_asset_id, building_area, floor_count, build_year,
                renovation_year, construction_type, building_function, capacity,
                imb_number, slf_number, slf_expiry
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (asset_id) DO UPDATE SET
                land_asset_id = EXCLUDED.land_asset_id,
                building_area = EXCLUDED.building_area,
                floor_count = EXCLUDED.floor_count,
                build_year = EXCLUDED.build_year,
                renovation_year = EXCLUDED.renovation_year,
                construction_type = EXCLUDED.construction_type,
                building_function = EXCLUDED.building_function,
                capacity = EXCLUDED.capacity,
                imb_number = EXCLUDED.imb_number,
                slf_number = EXCLUDED.slf_number,
                slf_expiry = EXCLUDED.slf_expiry
            "#
        )
        .bind(details.asset_id)
        .bind(details.land_asset_id)
        .bind(details.building_area)
        .bind(details.floor_count)
        .bind(details.build_year)
        .bind(details.renovation_year)
        .bind(&details.construction_type)
        .bind(&details.building_function)
        .bind(details.capacity)
        .bind(&details.imb_number)
        .bind(&details.slf_number)
        .bind(details.slf_expiry)
        .execute(executor)
        .await?;
        Ok(())
    }

    pub async fn upsert_heavy_equipment_details_with_executor(
        &self,
        executor: &mut sqlx::PgConnection,
        details: &crate::domain::entities::asset_details::HeavyEquipmentDetails,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            INSERT INTO heavy_equipment_details (
                asset_id, equipment_type, operating_weight, capacity,
                engine_model, hour_meter, certification_number, certification_expiry
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (asset_id) DO UPDATE SET
                equipment_type = EXCLUDED.equipment_type,
                operating_weight = EXCLUDED.operating_weight,
                capacity = EXCLUDED.capacity,
                engine_model = EXCLUDED.engine_model,
                hour_meter = EXCLUDED.hour_meter,
                certification_number = EXCLUDED.certification_number,
                certification_expiry = EXCLUDED.certification_expiry
            "#
        )
        .bind(details.asset_id)
        .bind(&details.equipment_type)
        .bind(details.operating_weight)
        .bind(&details.capacity)
        .bind(&details.engine_model)
        .bind(details.hour_meter)
        .bind(&details.certification_number)
        .bind(details.certification_expiry)
        .execute(executor)
        .await?;
        Ok(())
    }

    pub async fn upsert_machine_details_with_executor(
        &self,
        executor: &mut sqlx::PgConnection,
        details: &crate::domain::entities::asset_details::MachineDetails,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            INSERT INTO machine_details (
                asset_id, machine_type, technical_specs, installation_year,
                operating_hours, energy_source
            ) VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (asset_id) DO UPDATE SET
                machine_type = EXCLUDED.machine_type,
                technical_specs = EXCLUDED.technical_specs,
                installation_year = EXCLUDED.installation_year,
                operating_hours = EXCLUDED.operating_hours,
                energy_source = EXCLUDED.energy_source
            "#
        )
        .bind(details.asset_id)
        .bind(&details.machine_type)
        .bind(&details.technical_specs)
        .bind(details.installation_year)
        .bind(details.operating_hours)
        .bind(&details.energy_source)
        .execute(executor)
        .await?;
        Ok(())
    }

    pub async fn upsert_inventory_details_with_executor(
        &self,
        executor: &mut sqlx::PgConnection,
        details: &crate::domain::entities::asset_details::InventoryDetails,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            INSERT INTO inventory_details (
                asset_id, inventory_type, warranty_expiry, os_license, mac_address
            ) VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (asset_id) DO UPDATE SET
                inventory_type = EXCLUDED.inventory_type,
                warranty_expiry = EXCLUDED.warranty_expiry,
                os_license = EXCLUDED.os_license,
                mac_address = EXCLUDED.mac_address
            "#
        )
        .bind(details.asset_id)
        .bind(&details.inventory_type)
        .bind(details.warranty_expiry)
        .bind(&details.os_license)
        .bind(&details.mac_address)
        .execute(executor)
        .await?;
        Ok(())
    }

    pub async fn upsert_furniture_details_with_executor(
        &self,
        executor: &mut sqlx::PgConnection,
        details: &crate::domain::entities::asset_details::FurnitureDetails,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            INSERT INTO furniture_details (
                asset_id, furniture_type, material, dimensions, color, capacity
            ) VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (asset_id) DO UPDATE SET
                furniture_type = EXCLUDED.furniture_type,
                material = EXCLUDED.material,
                dimensions = EXCLUDED.dimensions,
                color = EXCLUDED.color,
                capacity = EXCLUDED.capacity
            "#
        )
        .bind(details.asset_id)
        .bind(&details.furniture_type)
        .bind(&details.material)
        .bind(&details.dimensions)
        .bind(&details.color)
        .bind(&details.capacity)
        .execute(executor)
        .await?;
        Ok(())
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

    /// Create document
    pub async fn create_document(
        &self,
        document: &AssetDocument,
    ) -> Result<AssetDocument, sqlx::Error> {
        sqlx::query_as::<_, AssetDocument>(
            r#"
            INSERT INTO asset_documents (id, asset_id, name, type, file_path, mime_type, size_bytes, expiry_date, notes, uploaded_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
            "#,
        )
        .bind(document.id)
        .bind(document.asset_id)
        .bind(&document.name)
        .bind(&document.type_)
        .bind(&document.file_path)
        .bind(&document.mime_type)
        .bind(document.size_bytes)
        .bind(document.expiry_date)
        .bind(&document.notes)
        .bind(document.uploaded_by)
        .fetch_one(&self.pool)
        .await
    }

    /// Find documents by asset ID
    pub async fn find_documents_by_asset_id(
        &self,
        asset_id: Uuid,
    ) -> Result<Vec<AssetDocument>, sqlx::Error> {
        sqlx::query_as::<_, AssetDocument>(
            r#"
            SELECT * FROM asset_documents WHERE asset_id = $1 ORDER BY created_at DESC
            "#,
        )
        .bind(asset_id)
        .fetch_all(&self.pool)
        .await
    }

    /// Bulk update status
    pub async fn bulk_update_status(&self, ids: &[Uuid], status: &str) -> Result<u64, sqlx::Error> {
        sqlx::query(
            "UPDATE assets SET status = $1, version = version + 1, updated_at = NOW() WHERE id = ANY($2)"
        )
        .bind(status)
        .bind(ids)
        .execute(&self.pool)
        .await
        .map(|r| r.rows_affected())
    }

    /// Bulk update location
    pub async fn bulk_update_location(
        &self,
        ids: &[Uuid],
        location_id: Uuid,
    ) -> Result<u64, sqlx::Error> {
        sqlx::query(
            "UPDATE assets SET location_id = $1, version = version + 1, updated_at = NOW() WHERE id = ANY($2)"
        )
        .bind(location_id)
        .bind(ids)
        .execute(&self.pool)
        .await
        .map(|r| r.rows_affected())
    }

    /// Bulk update department
    pub async fn bulk_update_department(
        &self,
        ids: &[Uuid],
        department_name: &str,
        department_id: Option<Uuid>,
    ) -> Result<u64, sqlx::Error> {
        sqlx::query(
            "UPDATE assets SET department = $1, department_id = $2, version = version + 1, updated_at = NOW() WHERE id = ANY($3)"
        )
        .bind(department_name)
        .bind(department_id)
        .bind(ids)
        .execute(&self.pool)
        .await
        .map(|r| r.rows_affected())
    }

    /// Get Asset Account ID (GL Control Account) via Category
    pub async fn get_asset_account_id(&self, asset_id: Uuid) -> Result<Option<Uuid>, sqlx::Error> {
        let row: Option<(Option<Uuid>,)> = sqlx::query_as(
            r#"
            SELECT c.asset_account_id
            FROM assets a
            LEFT JOIN categories c ON a.category_id = c.id
            WHERE a.id = $1
            "#,
        )
        .bind(asset_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.and_then(|r| r.0))
    }

    /// Get Asset Group (e.g. VEHICLES, HEAVY_EQ) via Category
    pub async fn get_asset_group(&self, asset_id: Uuid) -> Result<Option<String>, sqlx::Error> {
        let row: Option<(Option<String>,)> = sqlx::query_as(
            r#"
            SELECT c.asset_group
            FROM assets a
            LEFT JOIN categories c ON a.category_id = c.id
            WHERE a.id = $1
            "#,
        )
        .bind(asset_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.and_then(|r| r.0))
    }

    /// Update vehicle expiry date for a specific field
    pub async fn update_vehicle_expiry(
        &self,
        asset_id: Uuid,
        field: &str,
        date: NaiveDate,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            UPDATE assets
            SET vehicle_details = vehicle_details || jsonb_build_object($2, $3::date)
            WHERE id = $1
            "#,
        )
        .bind(asset_id)
        .bind(field)
        .bind(date)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// Find assets with vehicle documents expiring within days
    pub async fn find_expiring_vehicles(
        &self,
        days: i64,
    ) -> Result<Vec<(Asset, VehicleDetails)>, sqlx::Error> {
        let rows = sqlx::query(
            r#"
            SELECT 
                id, asset_code, name, category_id, location_id, department_id, department, assigned_to, vendor_id,
                is_rental, is_fuel, is_loan, asset_class, status, condition_id,
                serial_number, brand, model, year_manufacture,
                specifications, description, acquisition_method, funding_source,
                purchase_date, purchase_price, currency_id, unit_id, quantity,
                residual_value, useful_life_months,
                qr_code_url, notes,
                sale_price, sale_date, sold_to,
                created_at, updated_at, version,
                vehicle_details
            FROM assets
            WHERE vehicle_details IS NOT NULL
            AND (
                ((vehicle_details->>'stnk_expiry')::date BETWEEN CURRENT_DATE AND CURRENT_DATE + ($1 || ' days')::interval)
                OR
                ((vehicle_details->>'tax_expiry')::date BETWEEN CURRENT_DATE AND CURRENT_DATE + ($1 || ' days')::interval)
                OR
                ((vehicle_details->>'kir_expiry')::date BETWEEN CURRENT_DATE AND CURRENT_DATE + ($1 || ' days')::interval)
                OR
                ((vehicle_details->>'heavy_equipment_tax_expiry')::date BETWEEN CURRENT_DATE AND CURRENT_DATE + ($1 || ' days')::interval)
            )
            AND status != 'archived'
            "#,
        )
        .bind(days)
        .fetch_all(&self.pool)
        .await?;

        let mut results = Vec::new();
        for r in rows {
            use sqlx::Row;
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
                is_rental: r.get("is_rental"),
                is_fuel: r.get("is_fuel"),
                is_loan: r.get("is_loan"),
                asset_class: r.get("asset_class"),
                status: r.get("status"),
                condition_id: r.get("condition_id"),
                serial_number: r.get("serial_number"),
                brand: r.get("brand"),
                model: r.get("model"),
                year_manufacture: r.get("year_manufacture"),
                specifications: r.get("specifications"),
                description: r.get("description"),
                acquisition_method: r.get("acquisition_method"),
                funding_source: r.get("funding_source"),
                purchase_date: r.get("purchase_date"),
                purchase_price: r.get("purchase_price"),
                currency_id: r.get("currency_id"),
                unit_id: r.get("unit_id"),
                quantity: r.get("quantity"),
                residual_value: r.get("residual_value"),
                useful_life_months: r.get("useful_life_months"),
                qr_code_url: r.get("qr_code_url"),
                notes: r.get("notes"),
                sale_price: r.get("sale_price"),
                sale_date: r.get("sale_date"),
                sold_to: r.get("sold_to"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
                version: r.get("version"),
            };

            let vehicle_json: serde_json::Value = r.get("vehicle_details");
            if let Ok(mut details) = serde_json::from_value::<VehicleDetails>(vehicle_json) {
                details.asset_id = asset.id;
                results.push((asset, details));
            }
        }

        Ok(results)
    }
}
