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
            client: Client::new(),
        }
    }

    pub async fn send_otp_email(&self, email: &str, otp: &str) -> Result<(), AppError> {
        let body = json!({
            "sender": { "email": "no-reply@flow-backend.com", "name": "Flow Team" },
            "to": [{ "email": email }],
            "subject": "Your Flow OTP",
            "htmlContent": format!("<p>Your verification code is: <strong>{}</strong></p><p>This code will expire in 10 minutes.</p>", otp)
        });

        let response = self.client
            .post("https://api.brevo.com/v3/smtp/email")
            .header("api-key", &self.api_key)
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| AppError::ExternalService(format!("Failed to send email: {}", e)))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::ExternalService(format!("Brevo API error: {}", error_text)));
        }

        Ok(())
    }
}
