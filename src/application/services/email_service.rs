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
                    .singlepart(Attachment::new(filename).body(
                        invoice_pdf,
                        lettre::message::header::ContentType::parse("application/pdf").unwrap(),
                    )),
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
}
