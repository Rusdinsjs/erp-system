use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::{AssetRepository, MaintenanceRepository};
use chrono::NaiveDate;
use genpdf::{elements, style, Element};
use std::io::Cursor;

/// Service for generating reports and analytics data.
///
/// Handles PDF/CSV export generation and aggregates data for dashboards.
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

    /// Generates a CSV string containing all non-archived assets.
    ///
    /// Columns: ID, Code, Name, Status, Class, Brand, Model, Serial, Purchase Date, Price, Condition.
    pub async fn generate_asset_inventory_csv(&self) -> DomainResult<String> {
        let assets = self
            .asset_repo
            .find_all()
            .await
            .map_err(|e| DomainError::internal(e.to_string()))?;

        let mut wtr = csv::Writer::from_writer(vec![]);

        // Header
        wtr.write_record([
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
            wtr.write_record([
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
        wtr.write_record([
            "Date",
            "Asset Name",
            "Maintenance Type",
            "Status",
            "Cost",
            "Actual Date",
        ])
        .map_err(|e| DomainError::internal(e.to_string()))?;

        for log in logs {
            wtr.write_record([
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

    /// Generates a PDF byte vector containing the Asset Inventory report.
    ///
    /// Uses `genpdf` with custom fonts. Returns raw bytes suitable for creating a Blob response.
    pub async fn generate_asset_inventory_pdf(&self) -> DomainResult<Vec<u8>> {
        let assets = self
            .asset_repo
            .find_all()
            .await
            .map_err(|e| DomainError::internal(e.to_string()))?;

        // Create a new PDF document
        let font_dir = "assets/fonts";
        let font_family = genpdf::fonts::from_files(font_dir, "Roboto", None).map_err(|e| {
            let cwd = std::env::current_dir().unwrap_or_default();
            DomainError::internal(format!(
                "Failed to load fonts from '{}' (CWD: {:?}): {}",
                font_dir, cwd, e
            ))
        })?;

        let mut doc = genpdf::Document::new(font_family);
        doc.set_title("Asset Inventory Report");

        // Decorator
        let mut decorator = genpdf::SimplePageDecorator::new();
        decorator.set_margins(20); // Increased margins for better aesthetics
        doc.set_page_decorator(decorator);

        // --- Header Section ---
        let mut header_table = elements::TableLayout::new(vec![3, 7]); // 30% Logo, 70% Info
        header_table.set_cell_decorator(elements::FrameCellDecorator::new(false, false, false)); // No borders

        let mut row = header_table.row();

        // Logo Column
        let logo_path = "assets/logo.png";
        if let Ok(image) = elements::Image::from_path(logo_path) {
            // Scale down logo if needed or let it fit the cell
            row.push_element(image.with_alignment(genpdf::Alignment::Left));
        } else {
            // Fallback if logo invalid, empty cell
            row.push_element(elements::Break::new(1.0));
        }

        // Company Info Column
        let mut info_column = elements::LinearLayout::vertical();
        info_column.push(
            elements::Paragraph::new("PT. SARANA JAYA SERBAGUNA")
                .styled(style::Style::new().bold().with_font_size(16)),
        );
        info_column.push(
            elements::Paragraph::new("General Contractor, Supplier & Heavy Equipment Rental")
                .styled(style::Style::new().italic().with_font_size(10)),
        );
        info_column.push(
            elements::Paragraph::new("Jl. Pahlawan No. 123, Jakarta 12345")
                .styled(style::Style::new().with_font_size(10)),
        );
        info_column.push(
            elements::Paragraph::new("Telp: (021) 555-1234 | Email: info@sjs.co.id")
                .styled(style::Style::new().with_font_size(10)),
        );

        row.push_element(info_column);
        row.push()
            .map_err(|e| DomainError::internal(e.to_string()))?;

        doc.push(header_table);

        // Separator line
        doc.push(elements::Break::new(2.0));
        doc.push(elements::Paragraph::new("____________________________________________________________________________________________________").aligned(genpdf::Alignment::Center)); // Visual separator
        doc.push(elements::Break::new(2.0));

        // Report Title & Date
        doc.push(
            elements::Paragraph::new("Asset Inventory Report")
                .aligned(genpdf::Alignment::Center)
                .styled(style::Style::new().bold().with_font_size(18)),
        );
        let date_str = chrono::Utc::now().format("%Y-%m-%d %H:%M").to_string();
        doc.push(
            elements::Paragraph::new(format!("Generated on: {}", date_str))
                .aligned(genpdf::Alignment::Center)
                .styled(style::Style::new().italic().with_font_size(10)),
        );
        doc.push(elements::Break::new(2.0));

        // Table
        let mut table = elements::TableLayout::new(vec![1, 2, 4, 3, 3]); // Re-adjusted relative column widths
        table.set_cell_decorator(elements::FrameCellDecorator::new(true, true, false));

        // Table Header
        let headers = ["ID", "Code", "Name", "Status", "Class"];
        let mut header_row = table.row();
        for header in headers {
            header_row.push_element(
                elements::Paragraph::new(header)
                    .styled(style::Style::new().bold())
                    .padded(2),
            );
        }
        header_row
            .push()
            .map_err(|e| DomainError::internal(e.to_string()))?;

        // Table Body
        for asset in assets {
            let mut row = table.row();
            // Use padded(2) for indentation/spacing
            row.push_element(
                elements::Paragraph::new(asset.id.to_string().chars().take(8).collect::<String>())
                    .padded(2),
            ); // Shorten ID for display
            row.push_element(elements::Paragraph::new(asset.asset_code).padded(2));
            row.push_element(elements::Paragraph::new(asset.name).padded(2));
            row.push_element(elements::Paragraph::new(asset.status).padded(2));
            row.push_element(
                elements::Paragraph::new(asset.asset_class.unwrap_or_default()).padded(2),
            );
            row.push()
                .map_err(|e| DomainError::internal(e.to_string()))?;
        }

        doc.push(table);

        // Render to buffer
        let mut buffer = Cursor::new(Vec::new());
        doc.render(&mut buffer)
            .map_err(|e| DomainError::internal(format!("Failed to render PDF: {}", e)))?;

        Ok(buffer.into_inner())
    }

    pub async fn get_monthly_costs(
        &self,
    ) -> DomainResult<Vec<crate::domain::entities::analytics::MonthlyCost>> {
        self.maintenance_repo
            .get_monthly_costs()
            .await
            .map_err(|e| DomainError::internal(e.to_string()))
    }

    pub async fn get_asset_status_distribution(
        &self,
    ) -> DomainResult<Vec<crate::domain::entities::analytics::AssetStatusStats>> {
        self.asset_repo
            .get_status_distribution()
            .await
            .map_err(|e| DomainError::internal(e.to_string()))
    }
}
