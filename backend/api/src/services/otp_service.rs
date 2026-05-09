use crate::repositories::otp_repository::OTPRepository;
use crate::model::otp::OTP;
use crate::utils::error::AppError;
use crate::utils::generate_otp::generate_otp;
use chrono::{Utc, Duration};

#[derive(Clone)]
pub struct OTPService {
    repository: OTPRepository,
}

impl OTPService {
    pub fn new(repository: OTPRepository) -> Self {
        OTPService { repository }
    }

    pub async fn generate_otp(&self, email: &str) -> Result<String, AppError> {
        // 1. Delete existing OTPs for this email
        self.repository.delete_by_email(email).await?;

        // 2. Generate 6-digit OTP
        let code = generate_otp(6);

        // 3. Save new OTP
        let otp = OTP::new(email.to_string(), code.clone());
        self.repository.save(&otp).await?;

        Ok(code)
    }

    pub async fn verify_otp(&self, email: &str, code: &str) -> Result<bool, AppError> {
        let otp = match self.repository.find_by_email(email).await {
            Ok(otp) => otp,
            Err(AppError::NotFound(_)) => return Ok(false),
            Err(e) => return Err(e),
        };

        // Check if code matches
        if otp.otp != code {
            return Ok(false);
        }

        // Check expiration (e.g., 10 minutes)
        let now = Utc::now();
        if now > otp.created_at + Duration::minutes(10) {
            // OTP expired, delete it
            let _ = self.repository.delete_by_email(email).await;
            return Ok(false);
        }

        // OTP valid, delete it so it can't be reused
        self.repository.delete_by_email(email).await?;

        Ok(true)
    }
}