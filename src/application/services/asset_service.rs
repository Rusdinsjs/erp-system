//! Asset Service

use crate::domain::entities::asset_details::VehicleDetails;
use chrono::Utc;
use serde::Serialize;
use uuid::Uuid;

use crate::application::dto::{
    AssetSearchParams, BulkCreateAssetRequest, CreateAssetRequest, PaginatedResponse,
    UpdateAssetRequest,
};
use crate::domain::entities::{Asset, AssetHistory, AssetState, AssetSummary};
use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::AssetRepository;

use crate::infrastructure::cache::{CacheJson, CacheKey, CacheOperations};
use std::sync::Arc;

use crate::application::services::ApprovalService;
use crate::infrastructure::repositories::approval_repository::ApprovalRequest;

/// Result of an asset creation/update attempt
#[derive(Debug, Serialize)]
#[serde(untagged)]
pub enum AssetOperationResult {
    Success(Asset),
    PendingApproval(ApprovalRequest),
}

/// Asset service for business logic
#[derive(Clone)]
pub struct AssetService {
    repository: AssetRepository,
    cache: Arc<dyn CacheOperations>,
    approval_service: ApprovalService,
}

impl AssetService {
    pub fn new(
        repository: AssetRepository,
        cache: Arc<dyn CacheOperations>,
        approval_service: ApprovalService,
    ) -> Self {
        Self {
            repository,
            cache,
            approval_service,
        }
    }

    /// List assets with pagination
    pub async fn list(
        &self,
        page: i64,
        per_page: i64,
        department: Option<&str>,
    ) -> DomainResult<PaginatedResponse<AssetSummary>> {
        let offset = (page - 1) * per_page;
        let assets = self
            .repository
            .list(per_page, offset, department)
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

        let assets = self
            .repository
            .search(
                params.query.as_deref().unwrap_or(""),
                params.category_id,
                params.location_id,
                params.department.as_deref(),
                params.status.as_deref(),
                per_page,
                offset,
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
    pub async fn create(
        &self,
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

            return Ok(AssetOperationResult::PendingApproval(approval_request));
        }

        // --- Normal Creation Logic ---

        // Check if code already exists
        if let Some(_) = self
            .repository
            .find_by_code(&request.asset_code)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
        {
            return Err(DomainError::conflict("Asset code already exists"));
        }

        let mut asset = Asset::new(request.asset_code, request.name, request.category_id);

        // Set optional fields
        asset.location_id = request.location_id;
        asset.department = request.department;
        asset.department_id = request.department_id;
        asset.assigned_to = request.assigned_to;
        asset.vendor_id = request.vendor_id;
        asset.is_rental = request.is_rental.unwrap_or(false);
        asset.asset_class = request.asset_class;
        asset.condition_id = request.condition_id;
        asset.serial_number = request.serial_number;
        asset.brand = request.brand;
        asset.model = request.model;
        asset.year_manufacture = request.year_manufacture;
        asset.specifications = request.specifications;
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

        let created_asset = self.repository.create(&asset).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
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
                created_at: Utc::now(),
                updated_at: Utc::now(),
            };
            self.repository
                .upsert_vehicle_details(&details)
                .await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: format!("Failed to save vehicle details: {}", e),
                })?;
        }

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

        for asset_req in request.assets {
            // Re-use single create logic
            // In a real implementation this should use a transaction or batch insert
            // For now we iterate to ensure all logic (validation, vehicle details etc) is applied
            if let Ok(result) = self.create(asset_req, user_id, role_level).await {
                results.push(result);
            }
        }

        Ok(results)
    }

    /// Update asset
    pub async fn update(&self, id: Uuid, request: UpdateAssetRequest) -> DomainResult<Asset> {
        let mut asset = self.get_by_id(id).await?;

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

        let result = self.repository.update(&asset).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
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

        // Invalidate cache
        let _ = self.cache.delete(&CacheKey::asset(&id)).await;

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

        self.get_by_id(id).await
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
}
