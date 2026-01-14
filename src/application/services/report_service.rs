use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::{AssetRepository, MaintenanceRepository};
use chrono::NaiveDate;

#[derive(Clone)]
pub struct ReportService {
    asset_repo: AssetRepository,
    maintenance_repo: MaintenanceRepository,
}

impl ReportService {
    pub fn new(asset_repo: AssetRepository, maintenance_repo: MaintenanceRepository) -> Self {
        Self {
            asset_repo,
            maintenance_repo,
        }
    }

    pub async fn generate_asset_inventory_csv(&self) -> DomainResult<String> {
        let assets = self
            .asset_repo
            .find_all()
            .await
            .map_err(|e| DomainError::internal(e.to_string()))?;

        let mut wtr = csv::Writer::from_writer(vec![]);

        // Header
        wtr.write_record(&[
            "ID",
            "Code",
            "Name",
            "Status",
            "Class",
            "Brand",
            "Model",
            "Serial Number",
            "Purchase Date",
            "Purchase Price",
            "Condition",
        ])
        .map_err(|e| DomainError::internal(e.to_string()))?;

        for asset in assets {
            wtr.write_record(&[
                asset.id.to_string(),
                asset.asset_code,
                asset.name,
                asset.status,
                asset.asset_class.unwrap_or_default(),
                asset.brand.unwrap_or_default(),
                asset.model.unwrap_or_default(),
                asset.serial_number.unwrap_or_default(),
                asset
                    .purchase_date
                    .map(|d| d.to_string())
                    .unwrap_or_default(),
                asset
                    .purchase_price
                    .map(|d| d.to_string())
                    .unwrap_or_default(),
                asset
                    .condition_id
                    .map(|c| c.to_string())
                    .unwrap_or_default(),
            ])
            .map_err(|e| DomainError::internal(e.to_string()))?;
        }

        let data = String::from_utf8(
            wtr.into_inner()
                .map_err(|e| DomainError::internal(e.to_string()))?,
        )
        .map_err(|e| DomainError::internal(e.to_string()))?;

        Ok(data)
    }

    pub async fn generate_maintenance_log_csv(
        &self,
        start_date: NaiveDate,
        end_date: NaiveDate,
    ) -> DomainResult<String> {
        let logs = self
            .maintenance_repo
            .find_by_date_range(start_date, end_date)
            .await
            .map_err(|e| DomainError::internal(e.to_string()))?;

        let mut wtr = csv::Writer::from_writer(vec![]);

        // Header
        wtr.write_record(&[
            "Date",
            "Asset Name",
            "Maintenance Type",
            "Status",
            "Cost",
            "Actual Date",
        ])
        .map_err(|e| DomainError::internal(e.to_string()))?;

        for log in logs {
            wtr.write_record(&[
                log.scheduled_date
                    .map(|d| d.to_string())
                    .unwrap_or_default(),
                log.asset_name.unwrap_or_default(),
                log.type_name.unwrap_or_default(),
                log.status,
                log.cost.map(|c| c.to_string()).unwrap_or_default(),
                log.actual_date.map(|d| d.to_string()).unwrap_or_default(),
            ])
            .map_err(|e| DomainError::internal(e.to_string()))?;
        }

        let data = String::from_utf8(
            wtr.into_inner()
                .map_err(|e| DomainError::internal(e.to_string()))?,
        )
        .map_err(|e| DomainError::internal(e.to_string()))?;

        Ok(data)
    }
}
