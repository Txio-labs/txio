use crate::model::otp::OTP;
use crate::repositories::otp_repository::OTPRepository;
use crate::utils::error::AppError;
use crate::utils::generate_otp::generate_otp;
use chrono::{Duration, Utc};

const OTP_LENGTH: usize = 6;
const OTP_VALIDITY_MINUTES: i64 = 5;
const OTP_SEND_COOLDOWN_SECONDS: i64 = 60;
const OTP_MAX_FAILED_ATTEMPTS: i32 = 5;

#[derive(Clone)]
pub struct OTPService {
    repository: OTPRepository,
}

impl OTPService {
    pub fn new(repository: OTPRepository) -> Self {
        OTPService { repository }
    }

    pub async fn generate_otp(&self, email: &str) -> Result<String, AppError> {
        let now = Utc::now();

        if let Ok(existing_otp) = self.repository.find_by_email(email).await {
            if now < existing_otp.created_at + Duration::seconds(OTP_SEND_COOLDOWN_SECONDS) {
                return Err(AppError::BadRequest(
                    "OTP request rate limit exceeded. Please try again later.".into(),
                ));
            }

            let _ = self.repository.delete_by_email(email).await;
        }

        let code = generate_otp(OTP_LENGTH);
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

        let now = Utc::now();
        if now > otp.created_at + Duration::minutes(OTP_VALIDITY_MINUTES) {
            let _ = self.repository.delete_by_email(email).await;
            return Ok(false);
        }

        if !constant_time_eq(&otp.otp, code) {
            let failed_attempts = otp.failed_attempts + 1;
            if failed_attempts >= OTP_MAX_FAILED_ATTEMPTS {
                let _ = self.repository.delete_by_email(email).await;
            } else {
                self.repository
                    .update_failed_attempts(email, failed_attempts)
                    .await?;
            }
            return Ok(false);
        }

        self.repository.delete_by_email(email).await?;
        Ok(true)
    }
}

fn constant_time_eq(a: &str, b: &str) -> bool {
    if a.len() != b.len() {
        return false;
    }

    let mut diff = 0u8;
    for (x, y) in a.bytes().zip(b.bytes()) {
        diff |= x ^ y;
    }

    diff == 0
}
