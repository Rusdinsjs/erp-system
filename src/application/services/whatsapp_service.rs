//! WhatsApp Notification Service
//!
//! Handles sending automated notifications via WhatsApp Gateway API (e.g. Fonnte, Wablas, etc.)

use serde::{Deserialize, Serialize};
use crate::domain::errors::{DomainError, DomainResult};
use crate::application::services::SettingsService;
use tracing::{info, error};

#[derive(Debug, Serialize, Deserialize)]
struct WhatsAppPayload {
    target: String,
    message: String,
}

#[derive(Clone)]
pub struct WhatsAppService {
    settings_service: SettingsService,
}

impl WhatsAppService {
    pub fn new(settings_service: SettingsService) -> Self {
        Self { settings_service }
    }

    /// Send a single message to a specific number
    pub async fn send_message(&self, target: String, message: String) -> DomainResult<bool> {
        // Fetch configuration from settings
        let api_token = match self.settings_service.get_setting("whatsapp_api_token").await {
            Ok(s) => s.value.as_str().unwrap_or("").to_string(),
            Err(_) => "".to_string(),
        };

        let api_url = match self.settings_service.get_setting("whatsapp_api_url").await {
            Ok(s) => s.value.as_str().unwrap_or("https://api.fonnte.com/send").to_string(),
            Err(_) => "https://api.fonnte.com/send".to_string(),
        };

        if api_token.is_empty() {
            error!("WhatsApp API Token is not configured. Skipping message to {}", target);
            return Ok(false);
        }

        info!("Sending WhatsApp message to {}", target);

        let client = reqwest::Client::new();
        
        // This format is standard for providers like Fonnte
        let res = client.post(&api_url)
            .header("Authorization", api_token)
            .form(&[
                ("target", target.as_str()),
                ("message", message.as_str()),
            ])
            .send()
            .await;

        match res {
            Ok(response) => {
                let status = response.status();
                let body = response.text().await.unwrap_or_default();
                if status.is_success() {
                    info!("WhatsApp message sent successfully: {}", body);
                    Ok(true)
                } else {
                    error!("Failed to send WhatsApp message. Status: {}, Body: {}", status, body);
                    Ok(false)
                }
            }
            Err(e) => {
                error!("Error connecting to WhatsApp Gateway: {}", e);
                Err(DomainError::Internal(format!("WhatsApp Gateway Error: {}", e)))
            }
        }
    }

    /// Utility to send notifications to multiple admins
    pub async fn notify_admins(&self, message: String) -> DomainResult<usize> {
        let admin_numbers = match self.settings_service.get_setting("whatsapp_admin_numbers").await {
            Ok(s) => s.value.as_str().unwrap_or("").to_string(),
            Err(_) => "".to_string(),
        };

        if admin_numbers.is_empty() {
            return Ok(0);
        }

        let mut count = 0;
        // Assume comma separated numbers
        for number in admin_numbers.split(',') {
            let target = number.trim().to_string();
            if !target.is_empty() {
                if let Ok(true) = self.send_message(target, message.clone()).await {
                    count += 1;
                }
            }
        }

        Ok(count)
    }
}
