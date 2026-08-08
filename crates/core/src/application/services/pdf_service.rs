use crate::infrastructure::pdf::summary_generator::SummaryGenerator;

#[derive(Clone)]
pub struct PDFService {}

impl PDFService {
    pub fn new() -> Self {
        Self {}
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

    pub async fn generate_rental_invoice(
        &self,
        _billing_id: uuid::Uuid,
        _asset_name: String,
    ) -> Result<Vec<u8>, String> {
        Ok(Vec::new())
    }
}
