use genpdf::elements::*;

use rust_decimal::Decimal;

use crate::domain::entities::{Client, RentalBillingPeriod};

// Font Setup: In a real app, you'd load a font. For this we'll use a simple embedded one if generic or assume 'fonts/LiberationSans-Regular.ttf' exists.
// Since we don't have the font file in the repo yet, we'll need to handle it.
// For now, let's assume a default font or a simple one can be loaded.
// Ideally, we'd bundle a font.

pub struct InvoiceGenerator {
    billing: RentalBillingPeriod,
    asset_name: String,
    client: Client,
    invoice_number: String,
}

impl InvoiceGenerator {
    pub fn new(
        billing: RentalBillingPeriod,
        asset_name: String,
        client: Client,
        invoice_number: String,
    ) -> Self {
        Self {
            billing,
            asset_name,
            client,
            invoice_number,
        }
    }

    pub fn generate(self) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        // Load font - simplistic approach for now
        let font_family = genpdf::fonts::from_files("fonts", "LiberationSans", None)?;
        let mut doc = genpdf::Document::new(font_family);

        doc.set_title(format!("Invoice {}", self.invoice_number));

        // Decorator
        let mut decorator = genpdf::SimplePageDecorator::new();
        decorator.set_margins(10);
        doc.set_page_decorator(decorator);

        // --- Header ---
        let mut header = TableLayout::new(vec![1, 1]);
        header.push_row(vec![
            Box::new(Paragraph::new("COMPANY LOGO / NAME")),
            Box::new(Paragraph::new(format!("INVOICE\n#{}", self.invoice_number))),
        ]);
        doc.push(header);

        doc.push(Break::new(2));

        // --- Bill To ---
        doc.push(Paragraph::new("Bill To:"));
        doc.push(Paragraph::new(&self.client.name));
        if let Some(addr) = &self.client.address {
            doc.push(Paragraph::new(addr));
        }

        doc.push(Break::new(2));

        // --- Details ---
        doc.push(Paragraph::new(format!(
            "Rental Period: {} to {}",
            self.billing.period_start, self.billing.period_end
        )));
        doc.push(Paragraph::new(format!("Asset: {}", self.asset_name)));

        doc.push(Break::new(2));

        // --- Table ---
        let mut table = TableLayout::new(vec![4, 2, 2, 3]);
        table.set_cell_decorator(genpdf::elements::FrameCellDecorator::new(true, true, false));

        // Header
        table.push_row(vec![
            Box::new(Paragraph::new("Description")),
            Box::new(Paragraph::new("Hours")),
            Box::new(Paragraph::new("Rate")),
            Box::new(Paragraph::new("Amount")),
        ]);

        // Base
        let operating = self.billing.total_operating_hours.unwrap_or(Decimal::ZERO);
        let rate = self.billing.hourly_rate.unwrap_or(Decimal::ZERO);
        let base_amt = self.billing.base_amount.unwrap_or(Decimal::ZERO);
        let billable = self.billing.billable_hours.unwrap_or(Decimal::ZERO);

        table.push_row(vec![
            Box::new(Paragraph::new("Operating Hours")),
            Box::new(Paragraph::new(format!("{:.2}", billable))),
            Box::new(Paragraph::new(format!("{:.2}", rate))),
            Box::new(Paragraph::new(format!("{:.2}", base_amt))),
        ]);

        // Overtime
        let overtime = self.billing.total_overtime_hours.unwrap_or(Decimal::ZERO);
        let overtime_amt = self.billing.overtime_amount.unwrap_or(Decimal::ZERO);
        if overtime > Decimal::ZERO {
            table.push_row(vec![
                Box::new(Paragraph::new("Overtime")),
                Box::new(Paragraph::new(format!("{:.2}", overtime))),
                Box::new(Paragraph::new("-")),
                Box::new(Paragraph::new(format!("{:.2}", overtime_amt))),
            ]);
        }

        // Standby
        let standby = self.billing.total_standby_hours.unwrap_or(Decimal::ZERO);
        let standby_amt = self.billing.standby_amount.unwrap_or(Decimal::ZERO);
        if standby > Decimal::ZERO {
            table.push_row(vec![
                Box::new(Paragraph::new("Standby")),
                Box::new(Paragraph::new(format!("{:.2}", standby))),
                Box::new(Paragraph::new("-")),
                Box::new(Paragraph::new(format!("{:.2}", standby_amt))),
            ]);
        }

        doc.push(table);

        doc.push(Break::new(2));

        // --- Totals ---
        let subtotal = self.billing.subtotal.unwrap_or(Decimal::ZERO);
        let tax = self.billing.tax_amount.unwrap_or(Decimal::ZERO);
        let total = self.billing.total_amount.unwrap_or(Decimal::ZERO);

        let mut totals = TableLayout::new(vec![4, 1]);
        totals.push_row(vec![
            Box::new(Paragraph::new("Subtotal")),
            Box::new(Paragraph::new(format!("{:.2}", subtotal))),
        ]);
        totals.push_row(vec![
            Box::new(Paragraph::new("Tax")),
            Box::new(Paragraph::new(format!("{:.2}", tax))),
        ]);
        totals.push_row(vec![
            Box::new(Paragraph::new("Total")),
            Box::new(Paragraph::new(format!("{:.2}", total))),
        ]);

        doc.push(totals);

        // Render to buffer
        let mut buffer = Vec::new();
        doc.render(&mut buffer)?;

        Ok(buffer)
    }
}
