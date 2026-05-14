use crate::application::services::FinanceService;
use crate::domain::entities::{
    CreateBillItemRequest, CreatePurchaseBillRequest, TaxRenewal, UpdateTaxRenewalCostRequest,
    Vendor,
};
use crate::domain::errors::DomainError;
use crate::infrastructure::repositories::{
    AssetRepository, TaxRenewalRepository, VendorRepository,
};
use chrono::{NaiveDate, Utc};
use uuid::Uuid;

#[derive(Clone)]
pub struct TaxRenewalService {
    repository: TaxRenewalRepository,
    asset_repository: AssetRepository,
    finance_service: FinanceService,
    vendor_repository: VendorRepository,
    settings_service: crate::application::services::SettingsService,
    whatsapp_service: crate::application::services::WhatsAppService,
}

impl TaxRenewalService {
    pub fn new(
        repository: TaxRenewalRepository,
        asset_repository: AssetRepository,
        finance_service: FinanceService,
        vendor_repository: VendorRepository,
        settings_service: crate::application::services::SettingsService,
        whatsapp_service: crate::application::services::WhatsAppService,
    ) -> Self {
        Self {
            repository,
            asset_repository,
            finance_service,
            vendor_repository,
            settings_service,
            whatsapp_service,
        }
    }

    // Helper to get or create vendor based on destination
    async fn get_or_create_vendor(&self, vendor_name: &str) -> Result<Vendor, DomainError> {
        if let Some(vendor) = self
            .vendor_repository
            .find_by_name(vendor_name)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?
        {
            return Ok(vendor);
        }

        // Create if not exists
        let mut vendor = Vendor::new(
            format!("V-TAX-{}", Uuid::new_v4().to_string()[..4].to_uppercase()),
            vendor_name.to_string(),
        );
        vendor.address = Some("Kantor Instansi Terkait".to_string());
        vendor.contact_person = Some("System".to_string());

        self.vendor_repository
            .create(&vendor)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<TaxRenewal>, DomainError> {
        self.repository
            .find_by_id(id)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))
    }

    pub async fn create_renewal(
        &self,
        asset_id: Uuid,
        document_type: String,
        current_expiry: chrono::NaiveDate,
        notes: Option<String>,
    ) -> Result<TaxRenewal, DomainError> {
        let renewal = TaxRenewal {
            id: Uuid::new_v4(),
            asset_id,
            document_type,
            current_expiry,
            renewal_cost: None,
            status: "PENDING_INPUT".to_string(),
            invoice_id: None,
            notes,
            payment_destination: None,
            invoice_attachment: None,
            payment_date: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            asset_name: None,
        };
        self.repository
            .create(renewal)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))
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
                // Determine asset name if possible, but repository create usually minimal.
                // We'll init with None for asset_name as it's fetched via join usually.
                let renewal = TaxRenewal {
                    id: Uuid::new_v4(),
                    asset_id,
                    document_type: dtype.to_string(),
                    current_expiry: d,
                    renewal_cost: None,
                    status: "PENDING_INPUT".to_string(),
                    invoice_id: None,
                    notes: None,
                    payment_destination: None,
                    invoice_attachment: None,
                    payment_date: None,
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                    asset_name: None,
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

    pub async fn detect_expiring_assets(&self) -> Result<usize, DomainError> {
        // Fetch warning config from settings
        let warning_config = match self.settings_service.get_setting("tax_renewal_warning_days").await {
            Ok(setting) => setting.value,
            Err(_) => serde_json::json!({ "DEFAULT": 30 }),
        };

        let get_days = |dtype: &str| -> i64 {
            warning_config.get(dtype)
                .or_else(|| warning_config.get("DEFAULT"))
                .and_then(|v| v.as_i64())
                .unwrap_or(30)
        };

        // We need to check for each type with its specific warning days
        // To optimize, we find the max days to fetch a broad list of assets once, 
        // then filter each asset specifically.
        let max_days = [
            get_days("STNK"),
            get_days("TAX"),
            get_days("KIR"),
            get_days("LAPOR_TIBA"),
            get_days("HEAVY_EQUIPMENT_TAX")
        ].iter().cloned().max().unwrap_or(30);

        let expiring_assets = self
            .asset_repository
            .find_expiring_vehicles(max_days as i32)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;
        
        let mut count = 0;
        let today = Utc::now().date_naive();

        for (asset, details) in expiring_assets {
            let check_and_create = |date: Option<NaiveDate>, dtype: &str| -> bool {
                if let Some(d) = date {
                    let days_to_expiry = (d - today).num_days();
                    if days_to_expiry <= get_days(dtype) {
                        return true;
                    }
                }
                false
            };

            if check_and_create(details.stnk_expiry, "STNK") {
                count += self.create_pending_if_needed(asset.id, details.stnk_expiry, "STNK").await?;
            }
            if check_and_create(details.tax_expiry, "TAX") {
                count += self.create_pending_if_needed(asset.id, details.tax_expiry, "TAX").await?;
            }
            if check_and_create(details.kir_expiry, "KIR") {
                count += self.create_pending_if_needed(asset.id, details.kir_expiry, "KIR").await?;
            }
            if check_and_create(details.lapor_tiba_expiry, "LAPOR_TIBA") {
                count += self.create_pending_if_needed(asset.id, details.lapor_tiba_expiry, "LAPOR_TIBA").await?;
            }
            if check_and_create(details.heavy_equipment_tax_expiry, "HEAVY_EQUIPMENT_TAX") {
                count += self.create_pending_if_needed(asset.id, details.heavy_equipment_tax_expiry, "HEAVY_EQUIPMENT_TAX").await?;
            }
        }

        if count > 0 {
            let message = format!(
                "📢 *NOTIFIKASI SYSTEM*\n\nTerdeteksi *{}* dokumen aset yang akan segera kadaluarsa.\n\nMohon segera cek menu *Tax & Document Renewals* pada Dashboard untuk memproses perpanjangan.",
                count
            );
            let _ = self.whatsapp_service.notify_admins(message).await;
        }

        Ok(count)
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
            .update_cost(
                id,
                req.renewal_cost,
                req.notes,
                req.payment_destination,
                req.invoice_attachment,
            )
            .await
            .map_err(|e| DomainError::Database(e.to_string()))
    }

    pub async fn approve_renewal(
        &self,
        id: Uuid,
        notes: Option<String>,
    ) -> Result<TaxRenewal, DomainError> {
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

        // Get or create Vendor based on payment_destination or fallback to Samsat
        let vendor_name = renewal
            .payment_destination
            .as_deref()
            .unwrap_or("Samsat / Kantor Pajak");
        let vendor = self.get_or_create_vendor(vendor_name).await?;

        // Create Purchase Bill in Finance
        // renewal.renewal_cost is Option<Decimal>. It should be Some if status is PENDING_APPROVAL.
        let cost = renewal.renewal_cost.ok_or(DomainError::validation(
            "renewal_cost",
            "Missing renewal cost",
        ))?;

        let cost_f64 = rust_decimal::prelude::ToPrimitive::to_f64(&cost).unwrap_or(0.0);

        // Find "Utang Biaya Legal Armada" (2-1140)
        let payable_account = self
            .finance_service
            .find_by_code("2-1140")
            .await
            .unwrap_or(None);

        let bill_req = CreatePurchaseBillRequest {
            bill_number: format!("TAX-{}", Utc::now().timestamp()), // Generate unique bill number
            vendor_id: vendor.id,
            date: Utc::now().date_naive(),
            due_date: Some(Utc::now().date_naive()), // Due immediately
            budget_type: Some("OPEX".to_string()),   // Tax renewals are operational
            items: vec![CreateBillItemRequest {
                description: format!(
                    "Tax Renewal: {} - {} ({})",
                    renewal.document_type,
                    renewal
                        .asset_name
                        .clone()
                        .unwrap_or("Unknown Asset".to_string()),
                    renewal.current_expiry
                ),
                quantity: 1.0,
                unit_price: cost_f64,
                account_id: None, // Let Finance Service auto-select expense account
            }],
            attachment_url: renewal.invoice_attachment.clone(),
            account_payable_id: payable_account.map(|a| a.id),
        };

        let bill = self
            .finance_service
            .create_purchase_bill(bill_req)
            .await
            .map_err(|e| match e {
                // Map domain error if needed, usually just propagate
                _ => e,
            })?;

        // Update Tax Renewal status to INVOICED and link bill
        self.repository
            .update_invoice_id(id, bill.id, notes)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))
    }

    pub async fn reject_renewal(
        &self,
        id: Uuid,
        notes: Option<String>,
    ) -> Result<TaxRenewal, DomainError> {
        let renewal = self
            .repository
            .find_by_id(id)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?
            .ok_or(DomainError::not_found("TaxRenewal", id))?;

        if renewal.status != "PENDING_APPROVAL" {
            return Err(DomainError::validation(
                "status",
                "Invalid status for rejection",
            ));
        }

        self.repository
            .update_status(id, "PENDING_INPUT", notes, None)
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

        if !["APPROVED", "INVOICED", "PAID"].contains(&renewal.status.as_str()) {
            return Err(DomainError::validation(
                "status",
                "Invalid status for completion",
            ));
        }

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

        self.repository
            .update_status(id, "COMPLETED", None, Some(Utc::now().date_naive()))
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
