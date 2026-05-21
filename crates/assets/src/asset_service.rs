//! Asset Service

use chrono::Utc;
use management_system_core::domain::entities::asset_details::VehicleDetails;
use serde::Serialize;
use uuid::Uuid;

use management_system_core::infrastructure::repositories::AssetRepository;
use management_system_core::application::dto::{
    AssetSearchParams, BulkCreateAssetRequest, BulkUpdateAssetRequest, CreateAssetDocumentRequest,
    CreateAssetRequest, PaginatedResponse, SellAssetRequest, UpdateAssetRequest,
};
use management_system_core::domain::entities::{
    Asset, AssetDocument, AssetHistory, AssetState, AssetSummary,
};
use management_system_core::domain::errors::{DomainError, DomainResult};

use management_system_core::infrastructure::cache::{CacheJson, CacheKey, CacheOperations};
use std::sync::Arc;

use management_system_core::application::services::{ApprovalService, NotificationService};
use management_system_core::domain::entities::journal::{
    CreateJournalEntryRequest, CreateJournalLineRequest,
};
use management_system_core::infrastructure::repositories::{ApprovalRequest, JournalRepository};

/// Result of an asset creation/update attempt
#[derive(Debug, Serialize)]
#[serde(untagged)]
pub enum AssetOperationResult {
    Success(Box<Asset>),
    PendingApproval(Box<ApprovalRequest>),
}

/// Asset service for business logic
/// Service for managing the lifecycle of assets.
///
/// Handles creation, updates, status changes, and history tracking.
#[derive(Clone)]
pub struct AssetService {
    repository: AssetRepository,
    journal_repo: JournalRepository,
    cache: Arc<dyn CacheOperations>,
    approval_service: ApprovalService,
    notification_service: NotificationService,
}

impl AssetService {
    pub fn new(
        repository: AssetRepository,
        journal_repo: JournalRepository,
        cache: Arc<dyn CacheOperations>,
        approval_service: ApprovalService,
        notification_service: NotificationService,
    ) -> Self {
        Self {
            repository,
            journal_repo,
            cache,
            approval_service,
            notification_service,
        }
    }

    /// List assets with pagination
    pub async fn list(
        &self,
        page: i64,
        per_page: i64,
        department: Option<&str>,
        asset_group: Option<&str>,
    ) -> DomainResult<PaginatedResponse<AssetSummary>> {
        let offset = (page - 1) * per_page;
        let assets = self
            .repository
            .list(per_page, offset, department, asset_group)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        let total =
            self.repository
                .count()
                .await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                })?;

        Ok(PaginatedResponse::new(assets, total, page, per_page))
    }

    /// Get asset by ID
    /// Get asset by ID
    pub async fn get_by_id(&self, id: Uuid) -> DomainResult<Asset> {
        let cache_key = CacheKey::asset(&id);

        // Try cache
        if let Ok(Some(cached)) = self.cache.get_json::<Asset>(&cache_key).await {
            return Ok(cached);
        }

        let asset = self
            .repository
            .find_by_id(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("Asset", id))?;

        // Set cache
        let _ = self.cache.set_json(&cache_key, &asset, None).await;

        Ok(asset)
    }

    /// Check for expiring vehicle documents and send notifications
    pub async fn check_upcoming_expiries(&self) -> DomainResult<usize> {
        // Find vehicles with documents expiring in 30 days
        let expiring_vehicles = self
            .repository
            .find_expiring_vehicles(30)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        let mut notification_count = 0;
        let today = Utc::now().date_naive();
        // Look ahead 30 days
        let limit = today + chrono::Duration::days(30);

        for (asset, details) in expiring_vehicles {
            // Check STNK
            if let Some(date) = details.stnk_expiry {
                if date >= today && date <= limit {
                    // Only notify if within range (SQL already filters, but double check doesn't hurt)
                    let _ = self
                        .notification_service
                        .notify_admins(
                            "vehicle_expiry",
                            serde_json::json!({
                                "asset_name": asset.name,
                                "document_type": "STNK",
                                "expiry_date": date.to_string(),
                                "days_remaining": (date - today).num_days()
                            }),
                            Some("asset"),
                            Some(asset.id),
                        )
                        .await;
                    notification_count += 1;
                }
            }

            // Check Tax (Pajak)
            if let Some(date) = details.tax_expiry {
                if date >= today && date <= limit {
                    let _ = self
                        .notification_service
                        .notify_admins(
                            "vehicle_expiry",
                            serde_json::json!({
                                "asset_name": asset.name,
                                "document_type": "Pajak Kendaraan",
                                "expiry_date": date.to_string(),
                                "days_remaining": (date - today).num_days()
                            }),
                            Some("asset"),
                            Some(asset.id),
                        )
                        .await;
                    notification_count += 1;
                }
            }

            // Check KIR
            if let Some(date) = details.kir_expiry {
                if date >= today && date <= limit {
                    let _ = self
                        .notification_service
                        .notify_admins(
                            "vehicle_expiry",
                            serde_json::json!({
                                "asset_name": asset.name,
                                "document_type": "KIR",
                                "expiry_date": date.to_string(),
                                "days_remaining": (date - today).num_days()
                            }),
                            Some("asset"),
                            Some(asset.id),
                        )
                        .await;
                    notification_count += 1;
                }
            }
        }

        Ok(notification_count)
    }

    /// Get expiring vehicles for UI
    pub async fn get_upcoming_expiries(
        &self,
        days: i64,
    ) -> DomainResult<Vec<management_system_core::domain::entities::asset::AssetDetail>> {
        let expiring_vehicles =
            self.repository
                .find_expiring_vehicles(days)
                .await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                })?;

        let mut results = Vec::new();
        for (asset, details) in expiring_vehicles {
            results.push(
                management_system_core::domain::entities::asset::AssetDetail {
                    asset,
                    category_name: None, // Could fetch if needed, but for dashboard maybe not essential or can join in repo
                    location_name: None,
                    department_name: None,
                    department_manager_name: None,
                    assigned_to_name: None,
                    vendor_name: None,
                    condition_name: None,
                    vehicle_details: Some(details),
                    land_details: None,
                    building_details: None,
                    heavy_equipment_details: None,
                    machine_details: None,
                    inventory_details: None,
                    furniture_details: None,
                    total_maintenance_cost: None,
                    total_rental_income: None,
                },
            );
        }

        Ok(results)
    }

    /// Get asset detail by ID (with joins)
    pub async fn get_detail_by_id(
        &self,
        id: Uuid,
    ) -> DomainResult<management_system_core::domain::entities::asset::AssetDetail> {
        self.repository
            .find_detail_by_id(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("Asset", id))
    }

    /// Get asset by Code
    pub async fn get_by_code(&self, code: &str) -> DomainResult<Asset> {
        self.repository
            .find_by_code(code)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("Asset", code))
    }

    /// Search assets
    pub async fn search(
        &self,
        params: AssetSearchParams,
    ) -> DomainResult<PaginatedResponse<AssetSummary>> {
        let page = params.page.unwrap_or(1).max(1);
        let per_page = params.per_page.unwrap_or(20).clamp(1, 100);
        let offset = (page - 1) * per_page;

        let category_id_clean = params.category_id.as_ref().map(|s| {
            s.split(',')
                .map(|v| v.trim())
                .filter(|v| !v.is_empty())
                .collect::<Vec<_>>()
                .join(",")
        });
        let location_id_clean = params.location_id.as_ref().map(|s| {
            s.split(',')
                .map(|v| v.trim())
                .filter(|v| !v.is_empty())
                .collect::<Vec<_>>()
                .join(",")
        });
        let department_clean = params.department.as_ref().map(|s| {
            s.split(',')
                .map(|v| v.trim())
                .filter(|v| !v.is_empty())
                .collect::<Vec<_>>()
                .join(",")
        });
        let status_clean = params.status.as_ref().map(|s| {
            s.split(',')
                .map(|v| v.trim())
                .filter(|v| !v.is_empty())
                .collect::<Vec<_>>()
                .join(",")
        });

        tracing::info!(
            "Searching assets (raw): query='{}', category_id={:?}, location_id={:?}, status={:?}",
            params.query.as_deref().unwrap_or(""),
            params.category_id,
            params.location_id,
            params.status
        );

        let assets = self
            .repository
            .search(
                params.query.as_deref().unwrap_or(""),
                category_id_clean.as_deref(),
                location_id_clean.as_deref(),
                department_clean.as_deref(),
                status_clean.as_deref(),
                params.is_fuel,
                per_page,
                offset,
                params.exact_match.unwrap_or(false),
                params.sort_by.as_deref(),
                params.sort_order.as_deref(),
                params.asset_group.as_deref(),
            )
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        let total =
            self.repository
                .count()
                .await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                })?;

        Ok(PaginatedResponse::new(assets, total, page, per_page))
    }

    /// Create new asset
    /// Creates a new asset and logs the creation in history.
    ///
    /// Requires `create_asset` permission. Auto-assigns "available" status.
    pub async fn create(
        &self,
        request: CreateAssetRequest,
        user_id: Uuid,
        role_level: i32,
    ) -> DomainResult<AssetOperationResult> {
        let mut conn = self.repository.pool().acquire().await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: format!("Failed to acquire connection: {}", e),
            }
        })?;
        self.create_with_executor(&mut conn, request, user_id, role_level)
            .await
    }

    pub async fn create_with_executor(
        &self,
        executor: &mut sqlx::PgConnection,
        request: CreateAssetRequest,
        user_id: Uuid,
        role_level: i32,
    ) -> DomainResult<AssetOperationResult> {
        // Intercept for Approval if role_level > 2 (Manager is 2, SuperAdmin 1)
        if role_level > 2 {
            let data_json = serde_json::to_value(&request).map_err(|e| {
                DomainError::validation(
                    "request_data",
                    &format!("Failed to serialize request: {}", e),
                )
            })?;

            let approval_request = self
                .approval_service
                .create_request(
                    "Asset",
                    Uuid::nil(), // No ID yet
                    "CREATE",
                    user_id,
                    Some(data_json),
                )
                .await?;

            return Ok(AssetOperationResult::PendingApproval(Box::new(
                approval_request,
            )));
        }

        // --- Normal Creation Logic ---

        tracing::info!(
            "AssetService: Creating asset with code: {}",
            request.asset_code
        );

        // Check if code already exists
        if self
            .repository
            .find_by_code(&request.asset_code)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .is_some()
        {
            tracing::error!("AssetService: Code {} already exists", request.asset_code);
            return Err(DomainError::conflict("Asset code already exists"));
        }

        tracing::info!("AssetService: Code unique. Inserting...");
        let mut asset = Asset::new(request.asset_code, request.name, request.category_id);

        // Set optional fields
        asset.location_id = request.location_id;
        asset.department = request.department;
        asset.department_id = request.department_id;
        asset.assigned_to = request.assigned_to;
        asset.vendor_id = request.vendor_id;
        asset.is_rental = request.is_rental.unwrap_or(false);
        asset.is_fuel = request.is_fuel.unwrap_or(false);
        asset.is_loan = request.is_loan.unwrap_or(false);
        asset.asset_class = request.asset_class;
        asset.condition_id = request.condition_id;
        asset.serial_number = request.serial_number;
        asset.brand = request.brand;
        asset.model = request.model;
        asset.year_manufacture = request.year_manufacture;
        asset.specifications = request.specifications;
        asset.description = request.description;
        asset.acquisition_method = request.acquisition_method;
        asset.funding_source = request.funding_source;
        asset.purchase_date = request.purchase_date;
        asset.purchase_price = request.purchase_price;
        asset.currency_id = request.currency_id;
        asset.unit_id = request.unit_id;
        asset.quantity = request.quantity;
        asset.residual_value = request.residual_value;
        asset.useful_life_months = request.useful_life_months;
        if let Some(s) = request.status {
            asset.status = s;
        }
        asset.notes = request.notes;

        let created_asset = self
            .repository
            .create_with_executor(executor, &asset)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        // Handle Vehicle Details
        if let Some(vd) = request.vehicle_details {
            let details = VehicleDetails {
                asset_id: created_asset.id,
                license_plate: vd.license_plate,
                brand: vd.brand,
                model: vd.model,
                color: vd.color,
                vin: vd.vin,
                engine_number: vd.engine_number,
                bpkb_number: vd.bpkb_number,
                stnk_expiry: vd.stnk_expiry,
                kir_expiry: vd.kir_expiry,
                tax_expiry: vd.tax_expiry,
                fuel_type: vd.fuel_type,
                transmission: vd.transmission,
                capacity: vd.capacity,
                odometer_last: vd.odometer_last,
                lapor_tiba_expiry: vd.lapor_tiba_expiry,
                heavy_equipment_tax_expiry: vd.heavy_equipment_tax_expiry,
                created_at: Utc::now(),
                updated_at: Utc::now(),
            };
            self.repository
                .upsert_vehicle_details_with_executor(executor, &details)
                .await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: format!("Failed to save vehicle details: {}", e),
                })?;
        }

        // Handle Land Details
        if let Some(d) = request.land_details {
            let details = management_system_core::domain::entities::asset_details::LandDetails {
                asset_id: created_asset.id,
                certificate_number: d.certificate_number,
                land_area: d.land_area,
                address: d.address,
                zoning: d.zoning,
                rights_status: d.rights_status,
                rights_expiry: d.rights_expiry,
                pbb_number: d.pbb_number,
                njop_value: d.njop_value,
                gps_coordinates: d.gps_coordinates,
                boundaries: d.boundaries,
                created_at: Utc::now(),
                updated_at: Utc::now(),
            };
            self.repository.upsert_land_details_with_executor(executor, &details).await.map_err(|e| DomainError::ExternalServiceError { service: "database".to_string(), message: e.to_string() })?;
        }

        // Handle Building Details
        if let Some(d) = request.building_details {
            let details = management_system_core::domain::entities::asset_details::BuildingDetails {
                asset_id: created_asset.id,
                land_asset_id: d.land_asset_id,
                building_area: d.building_area,
                floor_count: d.floor_count,
                build_year: d.build_year,
                renovation_year: d.renovation_year,
                construction_type: d.construction_type,
                building_function: d.building_function,
                capacity: d.capacity,
                imb_number: d.imb_number,
                slf_number: d.slf_number,
                slf_expiry: d.slf_expiry,
                created_at: Utc::now(),
                updated_at: Utc::now(),
            };
            self.repository.upsert_building_details_with_executor(executor, &details).await.map_err(|e| DomainError::ExternalServiceError { service: "database".to_string(), message: e.to_string() })?;
        }

        // Handle Heavy Equipment Details
        if let Some(d) = request.heavy_equipment_details {
            let details = management_system_core::domain::entities::asset_details::HeavyEquipmentDetails {
                asset_id: created_asset.id,
                equipment_type: d.equipment_type,
                operating_weight: d.operating_weight,
                capacity: d.capacity,
                engine_model: d.engine_model,
                hour_meter: d.hour_meter,
                certification_number: d.certification_number,
                certification_expiry: d.certification_expiry,
                created_at: Utc::now(),
                updated_at: Utc::now(),
            };
            self.repository.upsert_heavy_equipment_details_with_executor(executor, &details).await.map_err(|e| DomainError::ExternalServiceError { service: "database".to_string(), message: e.to_string() })?;
        }

        // Handle Machine Details
        if let Some(d) = request.machine_details {
            let details = management_system_core::domain::entities::asset_details::MachineDetails {
                asset_id: created_asset.id,
                machine_type: d.machine_type,
                technical_specs: d.technical_specs,
                installation_year: d.installation_year,
                operating_hours: d.operating_hours,
                energy_source: d.energy_source,
                created_at: Utc::now(),
                updated_at: Utc::now(),
            };
            self.repository.upsert_machine_details_with_executor(executor, &details).await.map_err(|e| DomainError::ExternalServiceError { service: "database".to_string(), message: e.to_string() })?;
        }

        // Handle Inventory Details
        if let Some(d) = request.inventory_details {
            let details = management_system_core::domain::entities::asset_details::InventoryDetails {
                asset_id: created_asset.id,
                inventory_type: d.inventory_type,
                warranty_expiry: d.warranty_expiry,
                os_license: d.os_license,
                mac_address: d.mac_address,
                created_at: Utc::now(),
                updated_at: Utc::now(),
            };
            self.repository.upsert_inventory_details_with_executor(executor, &details).await.map_err(|e| DomainError::ExternalServiceError { service: "database".to_string(), message: e.to_string() })?;
        }

        // Handle Furniture Details
        if let Some(d) = request.furniture_details {
            let details = management_system_core::domain::entities::asset_details::FurnitureDetails {
                asset_id: created_asset.id,
                furniture_type: d.furniture_type,
                material: d.material,
                dimensions: d.dimensions,
                color: d.color,
                capacity: d.capacity,
                created_at: Utc::now(),
                updated_at: Utc::now(),
            };
            self.repository.upsert_furniture_details_with_executor(executor, &details).await.map_err(|e| DomainError::ExternalServiceError { service: "database".to_string(), message: e.to_string() })?;
        }

        let created_asset = Box::new(created_asset);

        // Real-time broadcast
        let _ = self
            .notification_service
            .broadcast("ASSET_CREATED", serde_json::json!(created_asset))
            .await;

        Ok(AssetOperationResult::Success(created_asset))
    }

    /// Bulk create assets
    pub async fn bulk_create(
        &self,
        request: BulkCreateAssetRequest,
        user_id: Uuid,
        role_level: i32,
    ) -> DomainResult<Vec<AssetOperationResult>> {
        let mut results = Vec::new();

        // Use a single transaction for bulk create
        let mut tx = self.repository.pool().begin().await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: format!("Failed to start transaction: {}", e),
            }
        })?;

        for asset_req in request.assets {
            // Re-use single create logic with transaction
            match self
                .create_with_executor(&mut tx, asset_req, user_id, role_level)
                .await
            {
                Ok(result) => results.push(result),
                Err(e) => {
                    // Log error but continue or abort?
                    // For bulk import, we usually want to continue and report errors
                    // But if it's a conflict we might want to skip.
                    // If we use a single TX, one failure will abort the WHOLE thing.
                    // If we want atomic bulk import, this is correct.
                    return Err(e);
                }
            }
        }

        tx.commit()
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: format!("Failed to commit transaction: {}", e),
            })?;

        Ok(results)
    }

    /// Update asset
    pub async fn update(&self, id: Uuid, request: UpdateAssetRequest) -> DomainResult<Asset> {
        // Bypass cache to get the latest version for optimistic locking
        let mut asset = self
            .repository
            .find_by_id(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("Asset", id))?;

        // Update fields if provided
        if let Some(code) = request.asset_code {
            asset.asset_code = code;
        }
        if let Some(name) = request.name {
            asset.name = name;
        }
        if let Some(cat) = request.category_id {
            asset.category_id = cat;
        }
        if let Some(loc) = request.location_id {
            asset.location_id = Some(loc);
        }
        if let Some(dept) = request.department {
            asset.department = Some(dept);
        }
        if let Some(dept) = request.department_id {
            asset.department_id = Some(dept);
        }
        if let Some(user) = request.assigned_to {
            asset.assigned_to = Some(user);
        }
        if let Some(v) = request.vendor_id {
            asset.vendor_id = Some(v);
        }
        if let Some(r) = request.is_rental {
            asset.is_rental = r;
        }
        if let Some(f) = request.is_fuel {
            asset.is_fuel = f;
        }
        if let Some(l) = request.is_loan {
            asset.is_loan = l;
        }
        if let Some(c) = request.asset_class {
            asset.asset_class = Some(c);
        }
        if let Some(s) = request.status {
            asset.status = s;
        }
        if let Some(c) = request.condition_id {
            asset.condition_id = Some(c);
        }
        if let Some(s) = request.serial_number {
            asset.serial_number = Some(s);
        }
        if let Some(b) = request.brand {
            asset.brand = Some(b);
        }
        if let Some(m) = request.model {
            asset.model = Some(m);
        }
        if let Some(y) = request.year_manufacture {
            asset.year_manufacture = Some(y);
        }
        if let Some(s) = request.specifications {
            asset.specifications = Some(s);
        }
        if let Some(d) = request.description {
            asset.description = Some(d);
        }
        if let Some(am) = request.acquisition_method {
            asset.acquisition_method = Some(am);
        }
        if let Some(fs) = request.funding_source {
            asset.funding_source = Some(fs);
        }
        if let Some(d) = request.purchase_date {
            asset.purchase_date = Some(d);
        }
        if let Some(p) = request.purchase_price {
            asset.purchase_price = Some(p);
        }
        if let Some(c) = request.currency_id {
            asset.currency_id = Some(c);
        }
        if let Some(u) = request.unit_id {
            asset.unit_id = Some(u);
        }
        if let Some(q) = request.quantity {
            asset.quantity = Some(q);
        }
        if let Some(r) = request.residual_value {
            asset.residual_value = Some(r);
        }
        if let Some(u) = request.useful_life_months {
            asset.useful_life_months = Some(u);
        }
        if let Some(n) = request.notes {
            asset.notes = Some(n);
        }
        if let Some(v) = request.version {
            if v != asset.version {
                return Err(DomainError::Conflict {
                    message: "Asset version mismatch. Data has been updated by another user."
                        .to_string(),
                });
            }
        }

        let result = self.repository.update(&asset).await.map_err(|e| {
            if matches!(e, sqlx::Error::RowNotFound) {
                DomainError::Conflict {
                    message: "Asset version mismatch. Data has been updated by another user."
                        .to_string(),
                }
            } else {
                DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                }
            }
        })?;

        // Handle Vehicle Details
        if let Some(vd) = request.vehicle_details {
            let details = VehicleDetails {
                asset_id: asset.id,
                license_plate: vd.license_plate,
                brand: vd.brand,
                model: vd.model,
                color: vd.color,
                vin: vd.vin,
                engine_number: vd.engine_number,
                bpkb_number: vd.bpkb_number,
                stnk_expiry: vd.stnk_expiry,
                kir_expiry: vd.kir_expiry,
                tax_expiry: vd.tax_expiry,
                fuel_type: vd.fuel_type,
                transmission: vd.transmission,
                capacity: vd.capacity,
                odometer_last: vd.odometer_last,
                lapor_tiba_expiry: vd.lapor_tiba_expiry,
                heavy_equipment_tax_expiry: vd.heavy_equipment_tax_expiry,
                created_at: asset.created_at, // Preserve original creation? No, this struct is new or updated.
                updated_at: Utc::now(),
            };
            self.repository
                .upsert_vehicle_details(&details)
                .await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: format!("Failed to update vehicle details: {}", e),
                })?;
        }

        // We use a transaction to upsert other details
        let mut tx = self.repository.pool().begin().await.map_err(|e| DomainError::ExternalServiceError {
            service: "database".to_string(),
            message: e.to_string(),
        })?;

        // Handle Land Details
        if let Some(d) = request.land_details {
            let details = management_system_core::domain::entities::asset_details::LandDetails {
                asset_id: asset.id,
                certificate_number: d.certificate_number,
                land_area: d.land_area,
                address: d.address,
                zoning: d.zoning,
                rights_status: d.rights_status,
                rights_expiry: d.rights_expiry,
                pbb_number: d.pbb_number,
                njop_value: d.njop_value,
                gps_coordinates: d.gps_coordinates,
                boundaries: d.boundaries,
                created_at: asset.created_at,
                updated_at: Utc::now(),
            };
            self.repository.upsert_land_details_with_executor(&mut tx, &details).await.map_err(|e| DomainError::ExternalServiceError { service: "database".to_string(), message: e.to_string() })?;
        }

        // Handle Building Details
        if let Some(d) = request.building_details {
            let details = management_system_core::domain::entities::asset_details::BuildingDetails {
                asset_id: asset.id,
                land_asset_id: d.land_asset_id,
                building_area: d.building_area,
                floor_count: d.floor_count,
                build_year: d.build_year,
                renovation_year: d.renovation_year,
                construction_type: d.construction_type,
                building_function: d.building_function,
                capacity: d.capacity,
                imb_number: d.imb_number,
                slf_number: d.slf_number,
                slf_expiry: d.slf_expiry,
                created_at: asset.created_at,
                updated_at: Utc::now(),
            };
            self.repository.upsert_building_details_with_executor(&mut tx, &details).await.map_err(|e| DomainError::ExternalServiceError { service: "database".to_string(), message: e.to_string() })?;
        }

        // Handle Heavy Equipment Details
        if let Some(d) = request.heavy_equipment_details {
            let details = management_system_core::domain::entities::asset_details::HeavyEquipmentDetails {
                asset_id: asset.id,
                equipment_type: d.equipment_type,
                operating_weight: d.operating_weight,
                capacity: d.capacity,
                engine_model: d.engine_model,
                hour_meter: d.hour_meter,
                certification_number: d.certification_number,
                certification_expiry: d.certification_expiry,
                created_at: asset.created_at,
                updated_at: Utc::now(),
            };
            self.repository.upsert_heavy_equipment_details_with_executor(&mut tx, &details).await.map_err(|e| DomainError::ExternalServiceError { service: "database".to_string(), message: e.to_string() })?;
        }

        // Handle Machine Details
        if let Some(d) = request.machine_details {
            let details = management_system_core::domain::entities::asset_details::MachineDetails {
                asset_id: asset.id,
                machine_type: d.machine_type,
                technical_specs: d.technical_specs,
                installation_year: d.installation_year,
                operating_hours: d.operating_hours,
                energy_source: d.energy_source,
                created_at: asset.created_at,
                updated_at: Utc::now(),
            };
            self.repository.upsert_machine_details_with_executor(&mut tx, &details).await.map_err(|e| DomainError::ExternalServiceError { service: "database".to_string(), message: e.to_string() })?;
        }

        // Handle Inventory Details
        if let Some(d) = request.inventory_details {
            let details = management_system_core::domain::entities::asset_details::InventoryDetails {
                asset_id: asset.id,
                inventory_type: d.inventory_type,
                warranty_expiry: d.warranty_expiry,
                os_license: d.os_license,
                mac_address: d.mac_address,
                created_at: asset.created_at,
                updated_at: Utc::now(),
            };
            self.repository.upsert_inventory_details_with_executor(&mut tx, &details).await.map_err(|e| DomainError::ExternalServiceError { service: "database".to_string(), message: e.to_string() })?;
        }

        // Handle Furniture Details
        if let Some(d) = request.furniture_details {
            let details = management_system_core::domain::entities::asset_details::FurnitureDetails {
                asset_id: asset.id,
                furniture_type: d.furniture_type,
                material: d.material,
                dimensions: d.dimensions,
                color: d.color,
                capacity: d.capacity,
                created_at: asset.created_at,
                updated_at: Utc::now(),
            };
            self.repository.upsert_furniture_details_with_executor(&mut tx, &details).await.map_err(|e| DomainError::ExternalServiceError { service: "database".to_string(), message: e.to_string() })?;
        }

        tx.commit().await.map_err(|e| DomainError::ExternalServiceError { service: "database".to_string(), message: e.to_string() })?;

        // Invalidate cache
        let _ = self.cache.delete(&CacheKey::asset(&id)).await;

        // Real-time broadcast
        let _ = self
            .notification_service
            .broadcast("ASSET_UPDATED", serde_json::json!(result))
            .await;

        Ok(result)
    }

    /// Change asset state
    pub async fn change_state(
        &self,
        id: Uuid,
        new_state: &str,
        performed_by: Option<Uuid>,
    ) -> DomainResult<Asset> {
        let asset = self.get_by_id(id).await?;

        let current = AssetState::from_str(&asset.status)
            .ok_or_else(|| DomainError::validation("status", "Invalid current state"))?;
        let target = AssetState::from_str(new_state)
            .ok_or_else(|| DomainError::validation("new_state", "Invalid target state"))?;

        if !current.can_transition_to(&target) {
            return Err(DomainError::invalid_transition(&asset.status, new_state));
        }

        self.repository
            .update_status(id, new_state)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        // Add history entry
        let history =
            AssetHistory::new(id, &format!("state_changed_to_{}", new_state), performed_by);
        let _ = self.repository.add_history(&history).await;

        let updated = self.get_by_id(id).await?;

        // Real-time broadcast
        let _ = self
            .notification_service
            .broadcast("ASSET_STATUS_CHANGED", serde_json::json!(updated))
            .await;

        // Invalidate cache
        let _ = self.cache.delete(&CacheKey::asset(&id)).await;

        Ok(updated)
    }

    /// Sell an asset
    pub async fn sell_asset(
        &self,
        id: Uuid,
        req: SellAssetRequest,
        user_id: Uuid,
        role_level: i32,
    ) -> DomainResult<AssetOperationResult> {
        // Intercept for Approval if role_level > 1 (Super Admin is 1)
        // User requested strict approval for "Sold" menu
        if role_level > 1 {
            let data_json = serde_json::to_value(&req).map_err(|e| {
                DomainError::validation(
                    "request_data",
                    &format!("Failed to serialize request: {}", e),
                )
            })?;

            let approval_request = self
                .approval_service
                .create_request("Asset", id, "SELL", user_id, Some(data_json))
                .await?;

            return Ok(AssetOperationResult::PendingApproval(Box::new(
                approval_request,
            )));
        }

        // Bypass cache to get the latest version and status
        let mut asset = self
            .repository
            .find_by_id(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("Asset", id))?;

        // 1. Validate State
        let current_state = AssetState::from_str(&asset.status)
            .ok_or_else(|| DomainError::validation("status", "Invalid current asset status"))?;

        if !current_state.can_transition_to(&AssetState::Sold) {
            return Err(DomainError::validation(
                "status",
                &format!(
                    "Cannot sell asset in status '{}'. Must be In Inventory, Deployed, or Retired.",
                    asset.status
                ),
            ));
        }

        // 2. Financial Calculations
        // Assuming purchase_price is set, otherwise book value is 0
        let purchase_price = asset.purchase_price.unwrap_or(rust_decimal::Decimal::ZERO);
        let book_value = asset
            .calculate_book_value()
            .unwrap_or(rust_decimal::Decimal::ZERO);
        let accum_depr = purchase_price - book_value;
        let sale_price = req.sale_price;
        let gain_loss = sale_price - book_value;

        // 3. Create Journal Entry (Accounting)
        // We need Chart of Account IDs. For this MVP, we'll hardcode or lookup placeholder accounts.
        // In a real system, these would be fetched from settings/configuration.
        let account_cash_uuid = Uuid::new_v4(); // TODO: Fetch "Cash/Bank" Account ID
        let account_accum_depr_uuid = Uuid::new_v4(); // TODO: Fetch "Accumulated Depreciation" Account ID
        let account_fixed_asset_uuid = Uuid::new_v4(); // TODO: Fetch "Fixed Asset" Account ID
        let account_gain_loss_uuid = Uuid::new_v4(); // TODO: Fetch "Gain/Loss on Disposal" Account ID

        let mut journal_lines = vec![
            // Debit: Cash/Receivable (Sale Price)
            CreateJournalLineRequest {
                account_id: account_cash_uuid,
                description: Some(format!("Sale of Asset: {}", asset.name)),
                debit: sale_price,
                credit: rust_decimal::Decimal::ZERO,
            },
            // Debit: Accumulated Depreciation (Clear it out)
            CreateJournalLineRequest {
                account_id: account_accum_depr_uuid,
                description: Some(format!("Clear Accum Depr: {}", asset.name)),
                debit: accum_depr,
                credit: rust_decimal::Decimal::ZERO,
            },
            // Credit: Fixed Asset (Original Cost)
            CreateJournalLineRequest {
                account_id: account_fixed_asset_uuid,
                description: Some(format!("Remove Asset Cost: {}", asset.name)),
                debit: rust_decimal::Decimal::ZERO,
                credit: purchase_price,
            },
        ];

        if gain_loss > rust_decimal::Decimal::ZERO {
            // Credit: Gain
            journal_lines.push(CreateJournalLineRequest {
                account_id: account_gain_loss_uuid,
                description: Some(format!("Gain on Sale: {}", asset.name)),
                debit: rust_decimal::Decimal::ZERO,
                credit: gain_loss,
            });
        } else if gain_loss < rust_decimal::Decimal::ZERO {
            // Debit: Loss (Negative gain means loss, so we debit the positive amount)
            journal_lines.push(CreateJournalLineRequest {
                account_id: account_gain_loss_uuid,
                description: Some(format!("Loss on Sale: {}", asset.name)),
                debit: gain_loss.abs(),
                credit: rust_decimal::Decimal::ZERO,
            });
        }

        // Generate Transaction Number (e.g., JE-YYYYMM-XXXX)
        // Using unwrap_or for simplicity if date parsing fails, though Utc::now() is safe
        let je_number = self
            .journal_repo
            .get_next_sequence_number(chrono::Utc::now().date_naive())
            .await?;

        // Attempt creating Journal Entry.
        // We log error instead of failing to not block operation if accounting is not fully set up.
        let je_req = CreateJournalEntryRequest {
            date: req.sale_date,
            description: format!(
                "Asset Sale: {} ({}) to {}",
                asset.name, asset.asset_code, req.sold_to
            ),
            reference: Some(asset.asset_code.clone()),
            lines: journal_lines,
        };

        // In a real scenario, we might want to ensure this succeeds.
        // For now, we proceed as the user might not have set up all accounts yet.
        let _ = self
            .journal_repo
            .create_journal_entry(je_number, &je_req, Some(user_id))
            .await;

        // 4. Update Asset
        asset.status = AssetState::Sold.as_str().to_string();
        asset.sale_price = Some(req.sale_price);
        asset.sale_date = Some(req.sale_date);
        asset.sold_to = Some(req.sold_to.clone());

        let updated_asset = self.repository.update(&asset.clone()).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })?;

        // 5. History
        let notes = format!(
            "Sold to {} for {}. Notes: {}",
            req.sold_to,
            req.sale_price,
            req.notes.unwrap_or_default()
        );
        let mut history = AssetHistory::new(asset.id, "sold", Some(user_id));
        history.notes = Some(notes);

        self.repository.add_history(&history).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })?;

        // Invalidate cache
        let cache_key = CacheKey::asset(&id);
        let _ = self.cache.delete(&cache_key).await;

        Ok(AssetOperationResult::Success(Box::new(updated_asset)))
    }

    /// Delete asset
    pub async fn delete(&self, id: Uuid) -> DomainResult<bool> {
        let result =
            self.repository
                .delete(id)
                .await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                })?;

        if result {
            // Invalidate cache
            let _ = self.cache.delete(&CacheKey::asset(&id)).await;

            // Real-time broadcast
            let _ = self
                .notification_service
                .broadcast("ASSET_DELETED", serde_json::json!({ "id": id }))
                .await;
        }

        Ok(result)
    }

    /// Get asset history
    pub async fn get_history(&self, id: Uuid) -> DomainResult<Vec<AssetHistory>> {
        self.repository
            .get_history(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Add document to asset
    pub async fn add_document(
        &self,
        asset_id: Uuid,
        request: CreateAssetDocumentRequest,
        uploaded_by: Option<Uuid>,
    ) -> DomainResult<AssetDocument> {
        // verify asset exists
        let _ = self.get_by_id(asset_id).await?;

        let document = AssetDocument {
            id: Uuid::new_v4(),
            asset_id,
            name: request.name,
            type_: request.type_,
            file_path: request.file_path,
            mime_type: request.mime_type,
            size_bytes: request.size_bytes,
            expiry_date: request.expiry_date,
            notes: request.notes,
            uploaded_by,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        self.repository
            .create_document(&document)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Get asset documents
    pub async fn get_documents(&self, asset_id: Uuid) -> DomainResult<Vec<AssetDocument>> {
        self.repository
            .find_documents_by_asset_id(asset_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }
    /// Bulk update assets
    pub async fn bulk_update(
        &self,
        req: BulkUpdateAssetRequest,
        _performed_by: Option<Uuid>,
    ) -> DomainResult<u64> {
        let mut total_affected = 0;

        if let Some(status) = req.status {
            total_affected += self
                .repository
                .bulk_update_status(&req.asset_ids, &status)
                .await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                })?;
        }

        if let Some(loc_id) = req.location_id {
            total_affected += self
                .repository
                .bulk_update_location(&req.asset_ids, loc_id)
                .await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                })?;
        }

        if let Some(dept_name) = req.department {
            total_affected += self
                .repository
                .bulk_update_department(&req.asset_ids, &dept_name, req.department_id)
                .await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                })?;
        }

        // Real-time broadcast for each updated asset
        for id in req.asset_ids {
            if let Ok(updated) = self.get_by_id(id).await {
                let _ = self
                    .notification_service
                    .broadcast("ASSET_UPDATED", serde_json::json!(updated))
                    .await;
            }
        }

        Ok(total_affected)
    }
}
