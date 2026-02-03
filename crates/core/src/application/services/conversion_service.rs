//! Conversion Service
//! Business logic for asset conversions

use crate::application::dto::{CreateConversionRequest, ExecuteConversionRequest};
use crate::domain::entities::conversion::AssetConversion;
use crate::domain::entities::AssetHistory;
use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::{AssetRepository, ConversionRepository};
use chrono::Utc;
use uuid::Uuid;

#[derive(Clone)]
pub struct ConversionService {
    conversion_repo: ConversionRepository,
    asset_repo: AssetRepository, // Added direct access for now
}

impl ConversionService {
    pub fn new(conversion_repo: ConversionRepository, asset_repo: AssetRepository) -> Self {
        Self {
            conversion_repo,
            asset_repo,
        }
    }

    /// Create a new conversion request
    pub async fn create_request(
        &self,
        request: CreateConversionRequest,
        requested_by: Uuid,
    ) -> DomainResult<AssetConversion> {
        // Validate asset exists
        let asset = self
            .asset_repo
            .find_by_id(request.asset_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("Asset", request.asset_id))?;

        // Generate Request Number (Simple Timestamp based for MVP)
        let request_number = format!("CNV-{}", Utc::now().format("%Y%m%d-%H%M%S"));

        let conversion = AssetConversion {
            id: Uuid::new_v4(),
            request_number,
            asset_id: request.asset_id,
            title: request.title,
            status: "pending".to_string(),
            from_category_id: Some(asset.category_id),
            to_category_id: request.to_category_id,
            target_specifications: request.target_specifications,
            conversion_cost: request.conversion_cost,
            cost_treatment: request.cost_treatment,
            reason: Some(request.reason),
            notes: None,
            requested_by,
            approved_by: None,
            executed_by: None,
            request_date: Some(Utc::now()),
            approval_date: None,
            execution_date: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        let created_conversion = self
            .conversion_repo
            .create(&conversion)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        // Update asset status to indicate conversion process?
        // For MVP, simplistic: Let's not lock it yet until approval or explicit status change.

        Ok(created_conversion)
    }

    /// Get pending requests
    pub async fn get_pending_requests(&self) -> DomainResult<Vec<AssetConversion>> {
        self.conversion_repo
            .find_pending()
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Approve a conversion request
    pub async fn approve_request(
        &self,
        id: Uuid,
        approved_by: Uuid,
    ) -> DomainResult<AssetConversion> {
        let mut conversion = self
            .conversion_repo
            .find_by_id(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("Conversion Request", id))?;

        conversion.status = "approved".to_string();
        conversion.approved_by = Some(approved_by);
        conversion.approval_date = Some(Utc::now());
        conversion.updated_at = Utc::now();

        let updated_conversion = self
            .conversion_repo
            .update(&conversion)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        Ok(updated_conversion)
    }

    /// Reject a conversion request
    pub async fn reject_request(
        &self,
        id: Uuid,
        // rejected_by: Uuid
    ) -> DomainResult<AssetConversion> {
        let mut conversion = self
            .conversion_repo
            .find_by_id(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("Conversion Request", id))?;

        conversion.status = "rejected".to_string();
        conversion.updated_at = Utc::now();

        let updated_conversion = self
            .conversion_repo
            .update(&conversion)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        Ok(updated_conversion)
    }

    /// Execute conversion
    pub async fn execute_conversion(
        &self,
        id: Uuid,
        executed_by: Uuid,
        request: ExecuteConversionRequest,
    ) -> DomainResult<AssetConversion> {
        let mut conversion = self
            .conversion_repo
            .find_by_id(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("Conversion Request", id))?;

        if conversion.status != "approved" {
            return Err(DomainError::validation(
                "status",
                "Only approved conversions can be executed",
            ));
        }

        // Update with notes if provided
        if let Some(notes) = request.notes {
            conversion.notes = Some(notes);
        }

        let mut asset = self
            .asset_repo
            .find_by_id(conversion.asset_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("Asset", conversion.asset_id))?;

        // 1. Update Asset Category
        asset.category_id = conversion.to_category_id;

        // 2. Update Specifications if present
        if let Some(specs) = &conversion.target_specifications {
            asset.specifications = Some(specs.clone());
        }

        // 3. Financial Treatment
        if conversion.cost_treatment == "capitalize" {
            if let Some(price) = asset.purchase_price {
                asset.purchase_price = Some(price + conversion.conversion_cost);
            } else {
                asset.purchase_price = Some(conversion.conversion_cost);
            }
        }

        // 4. Save Asset
        self.asset_repo
            .update(&asset)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        // 5. Update Conversion Status
        conversion.status = "executed".to_string();
        conversion.executed_by = Some(executed_by);
        conversion.execution_date = Some(Utc::now());
        conversion.updated_at = Utc::now();

        let updated_conversion = self
            .conversion_repo
            .update(&conversion)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        // 6. Add History
        let history = AssetHistory::new(
            asset.id,
            &format!("converted_to_category_{}", conversion.to_category_id),
            Some(executed_by),
        );
        let _ = self.asset_repo.add_history(&history).await;

        Ok(updated_conversion)
    }

    pub async fn get_asset_conversions(
        &self,
        asset_id: Uuid,
    ) -> DomainResult<Vec<AssetConversion>> {
        self.conversion_repo
            .find_by_asset_id(asset_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    pub async fn get_conversion(&self, id: Uuid) -> DomainResult<AssetConversion> {
        self.conversion_repo
            .find_by_id(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("Conversion", id))
    }
}
