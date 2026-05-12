use crate::domain::entities::AssetState;
use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::{
    AssetRepository, FinanceRepository, FuelRepository, LoanRepository, MaintenanceRepository,
    SettingsRepository, WorkOrderRepository,
};
use chrono::{NaiveDate, Utc};
use genpdf::{elements, style, Element};
use std::io::Cursor;

/// Service for generating reports and analytics data.
///
/// Handles PDF/CSV export generation and aggregates data for dashboards.
#[derive(Clone)]
pub struct ReportService {
    asset_repo: AssetRepository,
    maintenance_repo: MaintenanceRepository,
    finance_repo: FinanceRepository,
    settings_repo: SettingsRepository,
    fuel_repo: FuelRepository,
    loan_repo: LoanRepository,
    work_order_repo: WorkOrderRepository,
}

impl ReportService {
    pub fn new(
        asset_repo: AssetRepository,
        maintenance_repo: MaintenanceRepository,
        finance_repo: FinanceRepository,
        settings_repo: SettingsRepository,
        fuel_repo: FuelRepository,
        loan_repo: LoanRepository,
        work_order_repo: WorkOrderRepository,
    ) -> Self {
        Self {
            asset_repo,
            maintenance_repo,
            finance_repo,
            settings_repo,
            fuel_repo,
            loan_repo,
            work_order_repo,
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

        let settings = self
            .settings_repo
            .list()
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
        decorator.set_margins(20);
        doc.set_page_decorator(decorator);

        // --- Header Section ---
        self.add_dynamic_header(&mut doc, &settings)?;

        // Report Title & Date
        doc.push(
            elements::Paragraph::new("Asset Inventory Report")
                .aligned(genpdf::Alignment::Center)
                .styled(style::Style::new().bold().with_font_size(18)),
        );
        doc.push(
            elements::Paragraph::new(format!("Generated: {}", Utc::now().format("%Y-%m-%d %H:%M:%S")))
                .aligned(genpdf::Alignment::Center)
                .styled(style::Style::new().with_font_size(10)),
        );
        doc.push(elements::Break::new(1.5));
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
            let status_display = AssetState::from_str(&asset.status)
                .map(|s| s.display_name().to_string())
                .unwrap_or(asset.status);

            row.push_element(elements::Paragraph::new(asset.asset_code).padded(2));
            row.push_element(elements::Paragraph::new(asset.name).padded(2));
            row.push_element(elements::Paragraph::new(status_display).padded(2));
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

    pub async fn get_capex_opex_analysis(
        &self,
        start_date: Option<NaiveDate>,
        end_date: Option<NaiveDate>,
    ) -> DomainResult<Vec<crate::infrastructure::repositories::ExpenseAnalysis>> {
        self.finance_repo
            .get_expense_analysis(start_date, end_date)
            .await
    }

    pub async fn get_asset_status_distribution(
        &self,
    ) -> DomainResult<Vec<crate::domain::entities::analytics::AssetStatusStats>> {
        let raw_stats = self
            .asset_repo
            .get_status_distribution()
            .await
            .map_err(|e| DomainError::internal(e.to_string()))?;

        // Normalize and aggregate
        let mut normalization_map: std::collections::HashMap<String, i64> =
            std::collections::HashMap::new();

        for stat in raw_stats {
            let normalized_status = AssetState::from_str(&stat.status)
                .map(|s| s.as_str().to_string())
                .unwrap_or(stat.status); // Fallback to original if not a known enum variant

            *normalization_map.entry(normalized_status).or_insert(0) += stat.count;
        }

        let mut normalized_stats: Vec<crate::domain::entities::analytics::AssetStatusStats> =
            normalization_map
                .into_iter()
                .map(
                    |(status, count)| crate::domain::entities::analytics::AssetStatusStats {
                        status,
                        count,
                    },
                )
                .collect();

        // Sort by count descending
        normalized_stats.sort_by(|a, b| b.count.cmp(&a.count));

        Ok(normalized_stats)
    }

    /// Helper to add a dynamic header based on company settings to any PDF document.
    fn add_dynamic_header(
        &self,
        doc: &mut genpdf::Document,
        settings: &[crate::domain::entities::setting::Setting],
    ) -> DomainResult<()> {
        let company_name = settings
            .iter()
            .find(|s| s.key == "company_name")
            .map(|s| s.value.as_str().unwrap_or("-").to_string())
            .unwrap_or_else(|| "PT. SJS Group".to_string());

        let company_address = settings
            .iter()
            .find(|s| s.key == "company_address")
            .map(|s| s.value.as_str().unwrap_or("-").to_string())
            .unwrap_or_else(|| "Jl. Pahlawan No. 123, Jakarta".to_string());

        let company_email = settings
            .iter()
            .find(|s| s.key == "company_email")
            .map(|s| s.value.as_str().unwrap_or("-").to_string())
            .unwrap_or_else(|| "info@sjsgroup.site".to_string());

        let company_phone = settings
            .iter()
            .find(|s| s.key == "company_phone")
            .map(|s| s.value.as_str().unwrap_or("-").to_string())
            .unwrap_or_else(|| "(021) 555-1234".to_string());

        let app_name = settings
            .iter()
            .find(|s| s.key == "app_name")
            .map(|s| s.value.as_str().unwrap_or("-").to_string())
            .unwrap_or_else(|| "Management System".to_string());

        let mut header_table = elements::TableLayout::new(vec![3, 7]);
        header_table.set_cell_decorator(elements::FrameCellDecorator::new(false, false, false));

        let mut row = header_table.row();

        // Logo
        let logo_path = "assets/logo.png"; // Backend still uses local file for now, 
                                          // could be improved to use downloaded company_logo URL
        if let Ok(image) = elements::Image::from_path(logo_path) {
            row.push_element(image.with_alignment(genpdf::Alignment::Left));
        } else {
            row.push_element(elements::Break::new(1.0));
        }

        // Info
        let mut info_column = elements::LinearLayout::vertical();
        info_column.push(
            elements::Paragraph::new(company_name)
                .styled(style::Style::new().bold().with_font_size(16)),
        );
        info_column.push(
            elements::Paragraph::new(app_name)
                .styled(style::Style::new().italic().with_font_size(10)),
        );
        info_column.push(
            elements::Paragraph::new(company_address)
                .styled(style::Style::new().with_font_size(10)),
        );
        info_column.push(
            elements::Paragraph::new(format!(
                "Telp: {} | Email: {}",
                company_phone, company_email
            ))
            .styled(style::Style::new().with_font_size(10)),
        );

        row.push_element(info_column);
        row.push()
            .map_err(|e| DomainError::internal(e.to_string()))?;

        doc.push(header_table);
        doc.push(elements::Break::new(1.0));
        doc.push(
            elements::Paragraph::new(
                "________________________________________________________________________________",
            )
            .aligned(genpdf::Alignment::Center),
        );
        doc.push(elements::Break::new(1.0));

        Ok(())
    }

    pub async fn generate_fuel_report_pdf(&self) -> DomainResult<Vec<u8>> {
        let logs = self
            .fuel_repo
            .list(1000, 0)
            .await
            .map_err(|e| DomainError::internal(e.to_string()))?;

        // Fetch settings
        let settings = self
            .settings_repo
            .list()
            .await
            .map_err(|e| DomainError::internal(e.to_string()))?;

        let font_family = genpdf::fonts::from_files("./assets/fonts", "Roboto", None)
            .map_err(|e| DomainError::internal(e.to_string()))?;
        let mut doc = genpdf::Document::new(font_family);

        let mut decorator = genpdf::SimplePageDecorator::new();
        decorator.set_margins(20);
        doc.set_page_decorator(decorator);

        // Header
        self.add_dynamic_header(&mut doc, &settings)?;

        // Title
        doc.push(
            elements::Paragraph::new("Fuel Consumption Report")
                .aligned(genpdf::Alignment::Center)
                .styled(style::Style::new().bold().with_font_size(18)),
        );
        doc.push(
            elements::Paragraph::new(format!(
                "Generated: {}",
                Utc::now().format("%Y-%m-%d %H:%M:%S")
            ))
            .aligned(genpdf::Alignment::Center)
            .styled(style::Style::new().with_font_size(10)),
        );
        doc.push(elements::Break::new(1.5));

        // Table
        let mut table = elements::TableLayout::new(vec![2, 2, 2, 1, 1, 2]);
        table.set_cell_decorator(elements::FrameCellDecorator::new(true, true, true));

        let mut header_row = table.row();
        header_row.push_element(elements::Paragraph::new("Date").styled(style::Style::new().bold()));
        header_row
            .push_element(elements::Paragraph::new("Asset").styled(style::Style::new().bold()));
        header_row
            .push_element(elements::Paragraph::new("Odometer").styled(style::Style::new().bold()));
        header_row
            .push_element(elements::Paragraph::new("Liters").styled(style::Style::new().bold()));
        header_row
            .push_element(elements::Paragraph::new("Cost").styled(style::Style::new().bold()));
        header_row
            .push_element(elements::Paragraph::new("Status").styled(style::Style::new().bold()));
        header_row
            .push()
            .map_err(|e| DomainError::internal(e.to_string()))?;

        for log in logs {
            let mut row = table.row();
            row.push_element(elements::Paragraph::new(
                log.created_at.format("%Y-%m-%d").to_string(),
            ));
            row.push_element(elements::Paragraph::new(
                log.asset_name.unwrap_or_else(|| "-".to_string()),
            ));
            row.push_element(elements::Paragraph::new(log.odometer_reading.to_string()));
            row.push_element(elements::Paragraph::new(
                log.actual_volume.unwrap_or_default().to_string(),
            ));
            row.push_element(elements::Paragraph::new(
                log.actual_filled_amount.unwrap_or_default().to_string(),
            ));
            row.push_element(elements::Paragraph::new(log.status));
            row.push()
                .map_err(|e| DomainError::internal(e.to_string()))?;
        }

        doc.push(table);

        let mut buffer = Vec::new();
        doc.render(&mut buffer)
            .map_err(|e| DomainError::internal(e.to_string()))?;

        Ok(buffer)
    }

    pub async fn generate_fuel_report_csv(&self) -> DomainResult<Vec<u8>> {
        let logs = self
            .fuel_repo
            .list(1000, 0)
            .await
            .map_err(|e| DomainError::internal(e.to_string()))?;

        let mut wtr = csv::Writer::from_writer(Vec::new());

        // Header
        wtr.write_record(&[
            "Date",
            "Tracking ID",
            "Asset",
            "Odometer",
            "Liters",
            "Cost",
            "Status",
        ])
        .map_err(|e| DomainError::internal(e.to_string()))?;

        for log in logs {
            wtr.write_record(&[
                log.created_at.format("%Y-%m-%d").to_string(),
                log.tracking_number,
                log.asset_name.unwrap_or_else(|| "-".to_string()),
                log.odometer_reading.to_string(),
                log.actual_volume.unwrap_or_default().to_string(),
                log.actual_filled_amount.unwrap_or_default().to_string(),
                log.status,
            ])
            .map_err(|e| DomainError::internal(e.to_string()))?;
        }

        let buffer = wtr
            .into_inner()
            .map_err(|e| DomainError::internal(e.to_string()))?;
        Ok(buffer)
    }

    pub async fn generate_work_order_report_pdf(&self) -> DomainResult<Vec<u8>> {
        let orders = self
            .work_order_repo
            .list(1000, 0)
            .await
            .map_err(|e| DomainError::internal(e.to_string()))?;

        // Fetch settings
        let settings = self
            .settings_repo
            .list()
            .await
            .map_err(|e| DomainError::internal(e.to_string()))?;

        let font_family = genpdf::fonts::from_files("./assets/fonts", "Roboto", None)
            .map_err(|e| DomainError::internal(e.to_string()))?;
        let mut doc = genpdf::Document::new(font_family);

        let mut decorator = genpdf::SimplePageDecorator::new();
        decorator.set_margins(20);
        doc.set_page_decorator(decorator);

        // Header
        self.add_dynamic_header(&mut doc, &settings)?;

        // Title
        doc.push(
            elements::Paragraph::new("Work Order & Maintenance Report")
                .aligned(genpdf::Alignment::Center)
                .styled(style::Style::new().bold().with_font_size(18)),
        );
        doc.push(
            elements::Paragraph::new(format!(
                "Generated: {}",
                Utc::now().format("%Y-%m-%d %H:%M:%S")
            ))
            .aligned(genpdf::Alignment::Center)
            .styled(style::Style::new().with_font_size(10)),
        );
        doc.push(elements::Break::new(1.5));

        // Table
        let mut table = elements::TableLayout::new(vec![2, 2, 2, 1, 1, 1]);
        table.set_cell_decorator(elements::FrameCellDecorator::new(true, true, true));

        let mut header_row = table.row();
        header_row
            .push_element(elements::Paragraph::new("Number").styled(style::Style::new().bold()));
        header_row.push_element(elements::Paragraph::new("Asset").styled(style::Style::new().bold()));
        header_row.push_element(elements::Paragraph::new("Type").styled(style::Style::new().bold()));
        header_row
            .push_element(elements::Paragraph::new("Priority").styled(style::Style::new().bold()));
        header_row
            .push_element(elements::Paragraph::new("Status").styled(style::Style::new().bold()));
        header_row.push_element(elements::Paragraph::new("Cost").styled(style::Style::new().bold()));
        header_row
            .push()
            .map_err(|e| DomainError::internal(e.to_string()))?;

        for wo in orders {
            let mut row = table.row();
            row.push_element(elements::Paragraph::new(wo.wo_number));
            row.push_element(elements::Paragraph::new(
                wo.asset_name.unwrap_or_else(|| "-".to_string()),
            ));
            row.push_element(elements::Paragraph::new(wo.wo_type));
            row.push_element(elements::Paragraph::new(
                wo.priority.unwrap_or_else(|| "-".to_string()),
            ));
            row.push_element(elements::Paragraph::new(wo.status));
            row.push_element(elements::Paragraph::new(
                wo.actual_cost.unwrap_or_default().to_string(),
            ));
            row.push()
                .map_err(|e| DomainError::internal(e.to_string()))?;
        }

        doc.push(table);

        let mut buffer = Vec::new();
        doc.render(&mut buffer)
            .map_err(|e| DomainError::internal(e.to_string()))?;

        Ok(buffer)
    }

    pub async fn generate_work_order_report_csv(&self) -> DomainResult<Vec<u8>> {
        let orders = self
            .work_order_repo
            .list(1000, 0)
            .await
            .map_err(|e| DomainError::internal(e.to_string()))?;

        let mut wtr = csv::Writer::from_writer(Vec::new());

        // Header
        wtr.write_record(&[
            "Number",
            "Asset",
            "Type",
            "Priority",
            "Status",
            "Scheduled Date",
            "Cost",
        ])
        .map_err(|e| DomainError::internal(e.to_string()))?;

        for wo in orders {
            wtr.write_record(&[
                wo.wo_number,
                wo.asset_name.unwrap_or_else(|| "-".to_string()),
                wo.wo_type,
                wo.priority.unwrap_or_else(|| "-".to_string()),
                wo.status,
                wo.scheduled_date
                    .map(|d| d.to_string())
                    .unwrap_or_else(|| "-".to_string()),
                wo.actual_cost.unwrap_or_default().to_string(),
            ])
            .map_err(|e| DomainError::internal(e.to_string()))?;
        }

        let buffer = wtr
            .into_inner()
            .map_err(|e| DomainError::internal(e.to_string()))?;
        Ok(buffer)
    }

    pub async fn generate_loan_report_pdf(&self) -> DomainResult<Vec<u8>> {
        let loans = self
            .loan_repo
            .list(1000, 0)
            .await
            .map_err(|e| DomainError::internal(e.to_string()))?;

        // Fetch settings
        let settings = self
            .settings_repo
            .list()
            .await
            .map_err(|e| DomainError::internal(e.to_string()))?;

        let font_family = genpdf::fonts::from_files("./assets/fonts", "Roboto", None)
            .map_err(|e| DomainError::internal(e.to_string()))?;
        let mut doc = genpdf::Document::new(font_family);

        let mut decorator = genpdf::SimplePageDecorator::new();
        decorator.set_margins(20);
        doc.set_page_decorator(decorator);

        // Header
        self.add_dynamic_header(&mut doc, &settings)?;

        // Title
        doc.push(
            elements::Paragraph::new("Asset Loan & Rental Report")
                .aligned(genpdf::Alignment::Center)
                .styled(style::Style::new().bold().with_font_size(18)),
        );
        doc.push(
            elements::Paragraph::new(format!(
                "Generated: {}",
                Utc::now().format("%Y-%m-%d %H:%M:%S")
            ))
            .aligned(genpdf::Alignment::Center)
            .styled(style::Style::new().with_font_size(10)),
        );
        doc.push(elements::Break::new(1.5));

        // Table
        let mut table = elements::TableLayout::new(vec![2, 2, 2, 2, 2]);
        table.set_cell_decorator(elements::FrameCellDecorator::new(true, true, true));

        let mut header_row = table.row();
        header_row
            .push_element(elements::Paragraph::new("Number").styled(style::Style::new().bold()));
        header_row.push_element(elements::Paragraph::new("Asset").styled(style::Style::new().bold()));
        header_row
            .push_element(elements::Paragraph::new("Borrower").styled(style::Style::new().bold()));
        header_row
            .push_element(elements::Paragraph::new("Loan Date").styled(style::Style::new().bold()));
        header_row
            .push_element(elements::Paragraph::new("Status").styled(style::Style::new().bold()));
        header_row
            .push()
            .map_err(|e| DomainError::internal(e.to_string()))?;

        for loan in loans {
            let mut row = table.row();
            row.push_element(elements::Paragraph::new(loan.loan_number));
            row.push_element(elements::Paragraph::new(
                loan.asset_name.unwrap_or_else(|| "-".to_string()),
            ));
            row.push_element(elements::Paragraph::new(
                loan.borrower_name.unwrap_or_else(|| "-".to_string()),
            ));
            row.push_element(elements::Paragraph::new(loan.loan_date.to_string()));
            row.push_element(elements::Paragraph::new(loan.status));
            row.push()
                .map_err(|e| DomainError::internal(e.to_string()))?;
        }

        doc.push(table);

        let mut buffer = Vec::new();
        doc.render(&mut buffer)
            .map_err(|e| DomainError::internal(e.to_string()))?;

        Ok(buffer)
    }

    pub async fn generate_loan_report_csv(&self) -> DomainResult<Vec<u8>> {
        let loans = self
            .loan_repo
            .list(1000, 0)
            .await
            .map_err(|e| DomainError::internal(e.to_string()))?;

        let mut wtr = csv::Writer::from_writer(Vec::new());

        // Header
        wtr.write_record(&[
            "Number",
            "Asset",
            "Borrower",
            "Employee",
            "Loan Date",
            "Due Date",
            "Status",
        ])
        .map_err(|e| DomainError::internal(e.to_string()))?;

        for loan in loans {
            wtr.write_record(&[
                loan.loan_number,
                loan.asset_name.unwrap_or_else(|| "-".to_string()),
                loan.borrower_name.unwrap_or_else(|| "-".to_string()),
                loan.employee_name.unwrap_or_else(|| "-".to_string()),
                loan.loan_date.to_string(),
                loan.expected_return_date.to_string(),
                loan.status,
            ])
            .map_err(|e| DomainError::internal(e.to_string()))?;
        }

        let buffer = wtr
            .into_inner()
            .map_err(|e| DomainError::internal(e.to_string()))?;
        Ok(buffer)
    }
}
