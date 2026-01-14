//! Data Service
//!
//! Handles data export and import operations.

use csv::WriterBuilder;

use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::AssetRepository;

/// Data service for bulk operations
#[derive(Clone)]
pub struct DataService {
    pub asset_repository: AssetRepository,
}

impl DataService {
    pub fn new(asset_repository: AssetRepository) -> Self {
        Self { asset_repository }
    }

    /// Export assets to CSV
    pub async fn export_assets_csv(&self) -> DomainResult<String> {
        // Fetch all assets (pagination free for export, or batched)
        // For simplicity, we'll fetch a large page
        let assets = self
            .asset_repository
            .list(10000, 0, None)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        let mut wtr = WriterBuilder::new().from_writer(vec![]);

        // Write header
        wtr.write_record(&[
            "ID",
            "Code",
            "Name",
            "Status",
            "Brand",
            "Model",
            "Serial Number",
            "Purchase Price",
        ])
        .map_err(|e| DomainError::ExternalServiceError {
            service: "csv_export".to_string(),
            message: e.to_string(),
        })?;

        // Write records
        for asset in assets {
            wtr.write_record(&[
                asset.id.to_string(),
                asset.asset_code,
                asset.name,
                asset.status,
                asset.brand.unwrap_or_default(),
                asset.model.unwrap_or_default(),
                asset.serial_number.unwrap_or_default(),
                asset
                    .purchase_price
                    .map(|p| p.to_string())
                    .unwrap_or_default(),
            ])
            .map_err(|e| DomainError::ExternalServiceError {
                service: "csv_export".to_string(),
                message: e.to_string(),
            })?;
        }

        let data =
            String::from_utf8(
                wtr.into_inner()
                    .map_err(|e| DomainError::ExternalServiceError {
                        service: "csv_export".to_string(),
                        message: e.to_string(),
                    })?,
            )
            .map_err(|e| DomainError::ExternalServiceError {
                service: "csv_export".to_string(),
                message: e.to_string(),
            })?;

        Ok(data)
    }
}
