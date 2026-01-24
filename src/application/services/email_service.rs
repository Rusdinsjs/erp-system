//! Email Service
//!
//! Handles sending emails using Lettre.
//! Supports sending invoices with attachments.

use lettre::message::{Attachment, MultiPart, SinglePart};
use lettre::transport::smtp::authentication::Credentials;
use lettre::{AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor};
use std::env;

use crate::domain::entities::RentalBillingPeriod;
use crate::domain::errors::{DomainError, DomainResult};

#[derive(Clone)]
pub struct EmailService {
    mailer: Option<AsyncSmtpTransport<Tokio1Executor>>,
    from_email: String,
}

impl EmailService {
    pub fn new() -> Self {
        let smtp_host = env::var("SMTP_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
        let smtp_user = env::var("SMTP_USER").ok();
        let smtp_pass = env::var("SMTP_PASS").ok();
        let from_email =
            env::var("SMTP_FROM").unwrap_or_else(|_| "noreply@example.com".to_string());

        let mailer = if let (Some(user), Some(pass)) = (smtp_user, smtp_pass) {
            let creds = Credentials::new(user, pass);
            match AsyncSmtpTransport::<Tokio1Executor>::relay(&smtp_host) {
                Ok(builder) => Some(builder.credentials(creds).build()),
                Err(e) => {
                    eprintln!("Failed to build SMTP transport: {}", e);
                    None
                }
            }
        } else {
            // Development / No Auth - Use builder_dangerous for no-auth/relaxed TLS
            Some(AsyncSmtpTransport::<Tokio1Executor>::builder_dangerous(&smtp_host).build())
        };

        Self { mailer, from_email }
    }

    /// Send an invoice via email
    pub async fn send_invoice(
        &self,
        to_email: &str,
        invoice_pdf: Vec<u8>,
        billing: &RentalBillingPeriod,
    ) -> DomainResult<()> {
        let invoice_num = billing.invoice_number.as_deref().unwrap_or("DRAFT");

        if self.mailer.is_none() {
            println!("Mock Email Sent to {}: Invoice #{}", to_email, invoice_num);
            return Ok(());
        }

        let subject = format!("Invoice #{} from Asset Management", invoice_num);

        let body = format!(
            "Dear Client,\n\nPlease find attached the invoice #{} for the rental period {} to {}.\n\nThank you for your business.\n\nRegards,\nAsset Management Team",
            invoice_num,
            billing.period_start,
            billing.period_end
        );

        let filename = format!("Invoice_{}.pdf", invoice_num);

        let email = Message::builder()
            .from(self.from_email.parse().map_err(|e| {
                DomainError::validation("from_email", &format!("Invalid from address: {}", e))
            })?)
            .to(to_email.parse().map_err(|e| {
                DomainError::validation("to_email", &format!("Invalid to address: {}", e))
            })?)
            .subject(subject)
            .multipart(
                MultiPart::mixed()
                    .singlepart(
                        SinglePart::builder()
                            .header(lettre::message::header::ContentType::TEXT_PLAIN)
                            .body(body),
                    )
                    .singlepart(
                        Attachment::new(filename).body(
                            invoice_pdf,
                            lettre::message::header::ContentType::parse("application/pdf")
                                .map_err(|e| {
                                    DomainError::internal(format!(
                                        "Failed to parse PDF content type: {}",
                                        e
                                    ))
                                })?,
                        ),
                    ),
            )
            .map_err(|e| DomainError::internal(format!("Failed to build email: {}", e)))?;

        // Send email
        if let Some(mailer) = &self.mailer {
            mailer
                .send(email)
                .await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "email".to_string(),
                    message: e.to_string(),
                })?;
        }

        Ok(())
    }

    /// Send contract approval notification email
    pub async fn send_contract_approval_notification(
        &self,
        to_email: &str,
        approver_name: &str,
        contract_number: &str,
        current_level: i32,
        total_levels: i32,
        contract_id: &str,
    ) -> DomainResult<()> {
        if self.mailer.is_none() {
            println!(
                "Mock Email Sent to {}: Contract {} needs approval at level {}/{}",
                to_email, contract_number, current_level, total_levels
            );
            return Ok(());
        }

        let subject = format!("Contract {} Requires Your Approval", contract_number);

        let body = format!(
            "Dear {},\n\n\
            A contract requires your approval:\n\n\
            Contract Number: {}\n\
            Approval Level: {} of {}\n\
            Contract ID: {}\n\n\
            Please log in to the system to review and approve this contract.\n\n\
            Best regards,\n\
            Asset Management System",
            approver_name, contract_number, current_level, total_levels, contract_id
        );

        self.send_plain_email(to_email, &subject, &body).await
    }

    /// Send contract approved notification
    pub async fn send_contract_approved_notification(
        &self,
        to_email: &str,
        recipient_name: &str,
        contract_number: &str,
        approved_level: i32,
        approver_name: &str,
    ) -> DomainResult<()> {
        if self.mailer.is_none() {
            println!(
                "Mock Email Sent to {}: Contract {} approved at level {}",
                to_email, contract_number, approved_level
            );
            return Ok(());
        }

        let subject = format!("Contract {} Approved", contract_number);

        let body = format!(
            "Dear {},\n\n\
            Contract {} has been approved at level {} by {}.\n\n\
            Best regards,\n\
            Asset Management System",
            recipient_name, contract_number, approved_level, approver_name
        );

        self.send_plain_email(to_email, &subject, &body).await
    }

    /// Send contract rejected notification
    pub async fn send_contract_rejected_notification(
        &self,
        to_email: &str,
        recipient_name: &str,
        contract_number: &str,
        rejected_level: i32,
        rejector_name: &str,
        notes: Option<&str>,
    ) -> DomainResult<()> {
        if self.mailer.is_none() {
            println!(
                "Mock Email Sent to {}: Contract {} rejected at level {}",
                to_email, contract_number, rejected_level
            );
            return Ok(());
        }

        let subject = format!("Contract {} Rejected", contract_number);

        let notes_text = notes
            .map(|n| format!("\n\nRejection Notes:\n{}", n))
            .unwrap_or_default();

        let body = format!(
            "Dear {},\n\n\
            Contract {} has been rejected at level {} by {}.{}\n\n\
            Best regards,\n\
            Asset Management System",
            recipient_name, contract_number, rejected_level, rejector_name, notes_text
        );

        self.send_plain_email(to_email, &subject, &body).await
    }

    /// Send contract fully approved notification
    pub async fn send_contract_activated_notification(
        &self,
        to_email: &str,
        recipient_name: &str,
        contract_number: &str,
    ) -> DomainResult<()> {
        if self.mailer.is_none() {
            println!(
                "Mock Email Sent to {}: Contract {} is now active",
                to_email, contract_number
            );
            return Ok(());
        }

        let subject = format!("Contract {} is Now Active", contract_number);

        let body = format!(
            "Dear {},\n\n\
            Congratulations! Contract {} has completed all approval levels and is now active.\n\n\
            Best regards,\n\
            Asset Management System",
            recipient_name, contract_number
        );

        self.send_plain_email(to_email, &subject, &body).await
    }

    /// Helper method to send plain text email
    async fn send_plain_email(
        &self,
        to_email: &str,
        subject: &str,
        body: &str,
    ) -> DomainResult<()> {
        let email = Message::builder()
            .from(self.from_email.parse().map_err(|e| {
                DomainError::validation("from_email", &format!("Invalid from address: {}", e))
            })?)
            .to(to_email.parse().map_err(|e| {
                DomainError::validation("to_email", &format!("Invalid to address: {}", e))
            })?)
            .subject(subject)
            .body(body.to_string())
            .map_err(|e| DomainError::internal(format!("Failed to build email: {}", e)))?;

        if let Some(mailer) = &self.mailer {
            mailer
                .send(email)
                .await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "email".to_string(),
                    message: e.to_string(),
                })?;
        }

        Ok(())
    }
}
