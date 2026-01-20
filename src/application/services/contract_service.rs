use chrono::{Datelike, Utc};
use std::sync::Arc;
use uuid::Uuid;

use crate::application::dto::contract_dto::{CreateContractRequest, UpdateContractRequest};
use crate::domain::entities::RentalContract;
use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::contract_repository::ContractRepository; // Assuming this exists or using generic one

#[derive(Clone)]
pub struct ContractService {
    contract_repo: Arc<ContractRepository>,
    // client_repo: Arc<ClientRepository>, // If we have one, otherwise we might access client via other means or just trust ID
}

impl ContractService {
    pub fn new(contract_repo: Arc<ContractRepository>) -> Self {
        Self { contract_repo }
    }

    pub async fn create_contract(
        &self,
        request: CreateContractRequest,
        created_by: Uuid,
    ) -> DomainResult<RentalContract> {
        // Validate dates
        if request.end_date <= request.start_date {
            return Err(DomainError::validation(
                "date_range",
                "End date must be after start date",
            ));
        }

        // Generate contract number (simplified for MVP, ideally fetch client code)
        let year = Utc::now().year();
        let sequence = self.contract_repo.get_next_sequence(year).await?;
        // For MVP, we'll placeholder the client code part or fetch it if possible.
        // Assuming we pass client_id, we ideally want to look up client code.
        // For now, let's use "GEN" or similar if we don't have client repo access here yet.
        // NOTE: In a real scenario, we'd inject ClientRepository to fetch the code.
        let client_code = "CLI";

        let contract_number = RentalContract::generate_contract_number(client_code, year, sequence);

        let contract = RentalContract {
            id: Uuid::new_v4(),
            contract_number,
            client_id: request.client_id,
            start_date: request.start_date,
            end_date: request.end_date,
            auto_renew: request.auto_renew.or(Some(false)),
            renewal_notice_days: request.renewal_notice_days.or(Some(30)),
            payment_terms: request.payment_terms.or(Some("NET_30".to_string())),
            price_lock: request.price_lock.or(Some(true)),
            status: "draft".to_string(),
            contract_file_url: None,
            notes: request.notes,
            created_at: Some(Utc::now()),
            created_by: Some(created_by),
            updated_at: Some(Utc::now()),
            updated_by: None,
            approved_at: None,
            approved_by: None,
            terminated_at: None,
            terminated_by: None,
            termination_reason: None,
        };

        self.contract_repo.create(&contract).await
    }

    pub async fn get_contract(&self, id: Uuid) -> DomainResult<RentalContract> {
        self.contract_repo
            .find_by_id(id)
            .await?
            .ok_or_else(|| DomainError::not_found("Contract", id))
    }

    pub async fn list_contracts(&self) -> DomainResult<Vec<RentalContract>> {
        self.contract_repo.find_all().await
    }

    pub async fn list_expiring(&self) -> DomainResult<Vec<RentalContract>> {
        self.contract_repo.find_expiring_soon(30).await
    }

    pub async fn update_contract(
        &self,
        id: Uuid,
        request: UpdateContractRequest,
        updated_by: Uuid,
    ) -> DomainResult<RentalContract> {
        let mut contract = self.get_contract(id).await?;

        // Cannot update if terminated/expired? (Business rule decision)
        // For now allow updating unless completely locked

        if let Some(sd) = request.start_date {
            contract.start_date = sd;
        }
        if let Some(ed) = request.end_date {
            contract.end_date = ed;
        }
        if let Some(ar) = request.auto_renew {
            contract.auto_renew = Some(ar);
        }
        if let Some(pt) = request.payment_terms {
            contract.payment_terms = Some(pt);
        }
        if let Some(pl) = request.price_lock {
            contract.price_lock = Some(pl);
        }
        if let Some(s) = request.status {
            contract.status = s;
        }
        if let Some(n) = request.notes {
            contract.notes = Some(n);
        }
        if let Some(url) = request.contract_file_url {
            contract.contract_file_url = Some(url);
        }

        self.contract_repo.update(id, &contract, updated_by).await
    }
}
