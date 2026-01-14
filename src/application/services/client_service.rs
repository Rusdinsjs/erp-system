//! Client Service
//!
//! Business logic for managing external rental clients.

use uuid::Uuid;

use crate::domain::entities::Client;
use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::ClientRepository;

#[derive(Clone)]
pub struct ClientService {
    client_repo: ClientRepository,
}

impl ClientService {
    pub fn new(client_repo: ClientRepository) -> Self {
        Self { client_repo }
    }

    /// Create a new client
    pub async fn create_client(&self, client: Client) -> DomainResult<Client> {
        // Validate unique code if provided
        if let Some(existing) = self
            .client_repo
            .find_by_code(&client.client_code)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
        {
            return Err(DomainError::business_rule(
                "client_code",
                &format!("Client with code '{}' already exists", existing.client_code),
            ));
        }

        self.client_repo
            .create(&client)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Get client by ID
    pub async fn get_client(&self, id: Uuid) -> DomainResult<Client> {
        self.client_repo
            .find_by_id(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("Client", id))
    }

    /// List clients with pagination
    pub async fn list_clients(&self, limit: i64, offset: i64) -> DomainResult<(Vec<Client>, i64)> {
        let clients = self.client_repo.list(limit, offset).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })?;

        let total =
            self.client_repo
                .count()
                .await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                })?;

        Ok((clients, total))
    }

    /// Update client details
    pub async fn update_client(&self, id: Uuid, mut client: Client) -> DomainResult<Client> {
        // Ensure ID matches
        client.id = id;

        // Check if client exists
        let _existing = self.get_client(id).await?;

        self.client_repo
            .update(&client)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Search clients
    pub async fn search_clients(&self, query: &str, limit: i64) -> DomainResult<Vec<Client>> {
        self.client_repo
            .search(query, limit)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }
}
