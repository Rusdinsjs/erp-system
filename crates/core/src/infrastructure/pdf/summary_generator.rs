use crate::application::dto::dashboard_dto::DashboardStats;
use genpdf::{elements::*, style, Element};
use std::path::Path;

pub struct SummaryGenerator {
    stats: DashboardStats,
    report_date: String,
}

impl SummaryGenerator {
    pub fn new(stats: DashboardStats, report_date: String) -> Self {
        Self { stats, report_date }
    }

    pub fn generate(self) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        // Standardize on bits proven to work (Roboto from assets/fonts)
        let font_dir = "assets/fonts";
        let font_name = "Roboto";

        // Debug check for font directory
        if !Path::new(font_dir).exists() {
            let cwd = std::env::current_dir().unwrap_or_default();
            return Err(format!("Font directory '{}' not found. CWD: {:?}", font_dir, cwd).into());
        }

        let font_family = genpdf::fonts::from_files(font_dir, font_name, None).map_err(|e| {
            format!(
                "Failed to load font '{}' from '{}': {}",
                font_name, font_dir, e
            )
        })?;

        let mut doc = genpdf::Document::new(font_family);

        doc.set_title("Dashboard Summary Report");

        let mut decorator = genpdf::SimplePageDecorator::new();
        decorator.set_margins(15);
        doc.set_page_decorator(decorator);

        // Header
        doc.push(Paragraph::new("ASSET MANAGEMENT SYSTEM").aligned(genpdf::Alignment::Center));
        doc.push(Paragraph::new("DASHBOARD SUMMARY REPORT").aligned(genpdf::Alignment::Center));
        doc.push(
            Paragraph::new(format!("Date: {}", self.report_date))
                .aligned(genpdf::Alignment::Center),
        );
        doc.push(Break::new(2));

        // 1. Asset Overview
        doc.push(Paragraph::new("1. Asset Overview").styled(style::Style::new().bold()));
        doc.push(Paragraph::new(format!(
            "Total Assets: {}",
            self.stats.assets.total
        )));

        let total_value_str = self.stats.assets.total_value.to_string();
        doc.push(Paragraph::new(format!(
            "Total Value: Rp {}",
            total_value_str
        )));
        doc.push(Break::new(1));

        let mut status_table = TableLayout::new(vec![3, 1]);
        status_table
            .set_cell_decorator(genpdf::elements::FrameCellDecorator::new(true, true, false));
        status_table.push_row(vec![
            Box::new(Paragraph::new("Status").styled(style::Style::new().bold())),
            Box::new(Paragraph::new("Count").styled(style::Style::new().bold())),
        ])?;

        for status in &self.stats.assets.by_status {
            status_table.push_row(vec![
                Box::new(Paragraph::new(&status.status)),
                Box::new(Paragraph::new(status.count.to_string())),
            ])?;
        }
        doc.push(status_table);
        doc.push(Break::new(2));

        // 2. Operational Stats
        doc.push(Paragraph::new("2. Operational Status").styled(style::Style::new().bold()));
        let mut op_table = TableLayout::new(vec![2, 1]);
        op_table.push_row(vec![
            Box::new(Paragraph::new("Pending Maintenance")),
            Box::new(Paragraph::new(self.stats.maintenance.pending.to_string())),
        ])?;
        op_table.push_row(vec![
            Box::new(Paragraph::new("Overdue Maintenance")),
            Box::new(Paragraph::new(self.stats.maintenance.overdue.to_string())),
        ])?;
        op_table.push_row(vec![
            Box::new(Paragraph::new("Active Loans")),
            Box::new(Paragraph::new(self.stats.loans.active.to_string())),
        ])?;
        op_table.push_row(vec![
            Box::new(Paragraph::new("Overdue Loans")),
            Box::new(Paragraph::new(self.stats.loans.overdue.to_string())),
        ])?;
        doc.push(op_table);
        doc.push(Break::new(2));

        // 3. Category Distribution
        doc.push(
            Paragraph::new("3. Category Distribution (Top 5)").styled(style::Style::new().bold()),
        );
        let mut cat_table = TableLayout::new(vec![3, 1, 2]);
        cat_table.set_cell_decorator(genpdf::elements::FrameCellDecorator::new(true, true, false));
        cat_table.push_row(vec![
            Box::new(Paragraph::new("Category").styled(style::Style::new().bold())),
            Box::new(Paragraph::new("Count").styled(style::Style::new().bold())),
            Box::new(Paragraph::new("Value").styled(style::Style::new().bold())),
        ])?;

        for cat in &self.stats.category_distribution {
            let cat_value_str = cat.value.to_string();
            cat_table.push_row(vec![
                Box::new(Paragraph::new(&cat.category)),
                Box::new(Paragraph::new(cat.count.to_string())),
                Box::new(Paragraph::new(cat_value_str)),
            ])?;
        }
        doc.push(cat_table);

        doc.push(Break::new(3));
        doc.push(Paragraph::new("--- End of Report ---").aligned(genpdf::Alignment::Center));

        // Render
        let mut buffer = Vec::new();
        doc.render(&mut buffer)?;
        Ok(buffer)
    }
}
