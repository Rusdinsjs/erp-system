use crate::infrastructure::pdf::{
    invoice_generator::InvoiceGenerator, summary_generator::SummaryGenerator,
};

use crate::infrastructure::repositories::{
    ClientRepository, RentalBillingRepository, RentalRepository,
};

use uuid::Uuid;

#[derive(Clone)]
pub struct PDFService {
    billing_repo: RentalBillingRepository,
    rental_repo: RentalRepository,
    client_repo: ClientRepository,
}

impl PDFService {
    pub fn new(
        billing_repo: RentalBillingRepository,
        rental_repo: RentalRepository,
        client_repo: ClientRepository,
    ) -> Self {
        Self {
            billing_repo,
            rental_repo,
            client_repo,
        }
    }

    pub async fn generate_rental_invoice(
        &self,
        billing_id: Uuid,
        asset_name: String,
    ) -> Result<Vec<u8>, String> {
        // 1. Fetch Billing
        let billing = self
            .billing_repo
            .find_by_id(billing_id)
            .await
            .map_err(|e| e.to_string())?
            .ok_or("Billing record not found")?;

        // 2. Fetch Rental
        let rental = self
            .rental_repo
            .find_by_id(billing.rental_id)
            .await
            .map_err(|e| e.to_string())?
            .ok_or("Rental record not found")?;

        // 3. Fetch Client
        let client = self
            .client_repo
            .find_by_id(rental.client_id)
            .await
            .map_err(|e| e.to_string())?
            .ok_or("Client record not found")?;

        // 4. Generate PDF
        let invoice_num = billing
            .invoice_number
            .clone()
            .unwrap_or_else(|| "DRAFT".to_string());

        let generator = InvoiceGenerator::new(billing, asset_name, client, invoice_num);

        let pdf_bytes =
            tokio::task::spawn_blocking(move || generator.generate().map_err(|e| e.to_string()))
                .await
                .map_err(|e| e.to_string())??;

        Ok(pdf_bytes)
    }

    pub async fn generate_dashboard_summary(
        &self,
        stats: crate::application::dto::dashboard_dto::DashboardStats,
    ) -> Result<Vec<u8>, String> {
        let generator = SummaryGenerator::new(
            stats,
            chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string(),
        );

        let pdf_bytes =
            tokio::task::spawn_blocking(move || generator.generate().map_err(|e| e.to_string()))
                .await
                .map_err(|e| e.to_string())??;

        Ok(pdf_bytes)
    }
}
