use serde::{Deserialize};
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct RegisterUserRequest {
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 8))]
    pub password: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct LoginRequest {
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 8))]
    pub password: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct OTPRequest {
    #[validate(email)]
    pub email: String
}

#[derive(Debug, Deserialize, Validate)]
pub struct VerifyOTPRequest {
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 6, max = 6))]
    pub otp: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct ResetPasswordWithOTPRequest {
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 6, max = 6))]
    pub otp: String,
    #[validate(length(min = 8))]
    pub new_password: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateEmailRequest {
    #[validate(email)]
    pub old_email: String,
    #[validate(email)]
    pub new_email: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdatePasswordRequest {
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 8))]
    pub new_password: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct SwitchNetworkRequest {
    pub network: crate::model::user::SuiNetwork,
}

