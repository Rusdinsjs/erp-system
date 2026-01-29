use crate::application::dto::UpdateTaxRenewalCostRequest;
use crate::domain::entities::TaxRenewal;
use crate::domain::errors::DomainError;
use crate::infrastructure::repositories::{AssetRepository, TaxRenewalRepository};
use chrono::{NaiveDate, Utc};
use uuid::Uuid;

#[derive(Clone)]
pub struct TaxRenewalService {
    repository: TaxRenewalRepository,
    asset_repository: AssetRepository,
}

impl TaxRenewalService {
    pub fn new(repository: TaxRenewalRepository, asset_repository: AssetRepository) -> Self {
        Self {
            repository,
            asset_repository,
        }
    }

    pub async fn detect_expiring_assets(&self) -> Result<usize, DomainError> {
        // Find assets expiring in 30 days
        // This relies on asset_repo having a method to find expiry dates
        // We will reuse find_expiring_vehicles from AssetRepository but we need to modify it or logic here

        let expiring_assets = self
            .asset_repository
            .find_expiring_vehicles(30)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;
        let mut count = 0;

        for (asset, details) in expiring_assets {
            count += self
                .create_pending_if_needed(asset.id, details.stnk_expiry, "STNK")
                .await?;
            count += self
                .create_pending_if_needed(asset.id, details.tax_expiry, "TAX")
                .await?;
            count += self
                .create_pending_if_needed(asset.id, details.kir_expiry, "KIR")
                .await?;
            count += self
                .create_pending_if_needed(asset.id, details.lapor_tiba_expiry, "LAPOR_TIBA")
                .await?;
            count += self
                .create_pending_if_needed(
                    asset.id,
                    details.heavy_equipment_tax_expiry,
                    "HEAVY_EQUIPMENT_TAX",
                )
                .await?;
        }

        Ok(count)
    }

    async fn create_pending_if_needed(
        &self,
        asset_id: Uuid,
        date: Option<NaiveDate>,
        dtype: &str,
    ) -> Result<usize, DomainError> {
        if let Some(d) = date {
            // Check if already exists pending
            let existing = self
                .repository
                .find_pending_by_asset_and_type(asset_id, dtype)
                .await
                .map_err(|e| DomainError::Database(e.to_string()))?;

            if existing.is_none() {
                let renewal = TaxRenewal {
                    id: Uuid::new_v4(),
                    asset_id,
                    document_type: dtype.to_string(),
                    current_expiry: d,
                    renewal_cost: None,
                    status: "PENDING_INPUT".to_string(),
                    invoice_id: None,
                    notes: None,
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                };
                self.repository
                    .create(renewal)
                    .await
                    .map_err(|e| DomainError::Database(e.to_string()))?;
                return Ok(1);
            }
        }
        Ok(0)
    }

    pub async fn submit_cost(
        &self,
        id: Uuid,
        req: UpdateTaxRenewalCostRequest,
    ) -> Result<TaxRenewal, DomainError> {
        let renewal = self
            .repository
            .find_by_id(id)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?
            .ok_or(DomainError::not_found("TaxRenewal", id))?;

        if renewal.status != "PENDING_INPUT" {
            return Err(DomainError::validation(
                "status",
                "Invalid status for cost input",
            ));
        }

        self.repository
            .update_cost(id, req.renewal_cost, req.notes)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))
    }

    pub async fn approve_renewal(&self, id: Uuid) -> Result<TaxRenewal, DomainError> {
        let renewal = self
            .repository
            .find_by_id(id)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?
            .ok_or(DomainError::not_found("TaxRenewal", id))?;

        if renewal.status != "PENDING_APPROVAL" {
            return Err(DomainError::validation(
                "status",
                "Invalid status for approval",
            ));
        }

        // Logic to create Invoice in Finance would go here
        // For now we just mark as APPROVED (Ready for Payment)

        self.repository
            .update_status(id, "APPROVED")
            .await
            .map_err(|e| DomainError::Database(e.to_string()))
    }

    pub async fn complete_renewal(
        &self,
        id: Uuid,
        new_expiry_date: NaiveDate,
    ) -> Result<TaxRenewal, DomainError> {
        let renewal = self
            .repository
            .find_by_id(id)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?
            .ok_or(DomainError::not_found("TaxRenewal", id))?;

        // Allow completion from APPROVED or INVOICED or PAID
        if !["APPROVED", "INVOICED", "PAID"].contains(&renewal.status.as_str()) {
            return Err(DomainError::validation(
                "status",
                "Invalid status for completion",
            ));
        }

        // 1. Update Asset (Vehicle Details)
        // We need update_vehicle_expiry in AssetService or Repository
        // Since we have asset_repository, we can use it if it has the method.
        // It likely does NOT have a specific method for this yet, or we reuse update.
        // Let's assume we need to update the JSON.
        // For simplicity/speed, let's implement a specific method in AssetRepository to update single expiry field.

        // This is complex because we need to know WHICH field to update based on document_type.
        let field_name = match renewal.document_type.as_str() {
            "STNK" => "stnk_expiry",
            "TAX" => "tax_expiry",
            "KIR" => "kir_expiry",
            "LAPOR_TIBA" => "lapor_tiba_expiry",
            "HEAVY_EQUIPMENT_TAX" => "heavy_equipment_tax_expiry",
            _ => {
                return Err(DomainError::validation(
                    "document_type",
                    "Unknown document type",
                ))
            }
        };

        self.asset_repository
            .update_vehicle_expiry(renewal.asset_id, field_name, new_expiry_date)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;

        // 2. Mark Renewal as COMPLETED
        self.repository
            .update_status(id, "COMPLETED")
            .await
            .map_err(|e| DomainError::Database(e.to_string()))
    }

    pub async fn list_renewals(
        &self,
        status: Option<String>,
    ) -> Result<Vec<TaxRenewal>, DomainError> {
        self.repository
            .list_by_status(status)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))
    }
}
