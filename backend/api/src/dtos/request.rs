use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Debug, Deserialize, Serialize, Validate)]
pub struct RegisterUserRequest {
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 8))]
    pub password: String,
}

#[derive(Debug, Deserialize, Serialize, Validate)]
pub struct LoginRequest {
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 8))]
    pub password: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct OTPRequest {
    #[validate(email)]
    pub email: String,
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

#[derive(Debug, Validate, Serialize, Deserialize)]
pub struct UpdateEmailRequest {
    #[validate(email)]
    pub new_email: String,
}

#[derive(Debug, Validate, Serialize, Deserialize)]
pub struct UpdatePasswordRequest {
    pub current_password: String,
    #[validate(length(min = 8))]
    pub new_password: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct SwitchNetworkRequest {
    pub network: crate::model::user::SuiNetwork,
}
#[derive(Debug, Deserialize, Validate)]
pub struct TerminalCommandRequest {
    #[validate(length(min = 1))]
    pub command: String,
}
