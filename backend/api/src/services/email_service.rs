use crate::utils::error::AppError;
use reqwest::Client;
use serde_json::json;

#[derive(Clone)]
pub struct EmailService {
    api_key: String,
    client: Client,
}

impl EmailService {
    pub fn new(api_key: String) -> Self {
        Self {
            api_key,
            client: Client::builder()
                .timeout(std::time::Duration::from_secs(30))
                .build()
                .unwrap_or_else(|_| Client::new()),
        }
    }

    pub async fn send_otp_email(&self, email: &str, otp: &str) -> Result<(), AppError> {
        // Brevo only sends from verified senders, so the from-address must be
        // configurable per deployment instead of a hardcoded domain.
        let from_email =
            std::env::var("EMAIL_FROM").unwrap_or_else(|_| "no-reply@txio-backend.com".to_string());
        let from_name =
            std::env::var("EMAIL_FROM_NAME").unwrap_or_else(|_| "txio Team".to_string());

        let body = json!({
            "sender": { "email": from_email, "name": from_name },
            "to": [{ "email": email }],
            "subject": "Your txio OTP",
            "htmlContent": format!("<p>Your verification code is: <strong>{}</strong></p><p>This code will expire in 10 minutes.</p>", otp)
        });

        let response = self
            .client
            .post("https://api.brevo.com/v3/smtp/email")
            .header("api-key", &self.api_key)
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| AppError::ExternalService(format!("Failed to send email: {e}")))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::ExternalService(format!(
                "Brevo API error: {error_text}"
            )));
        }

        Ok(())
    }
}
