use crate::model::user::NotificationPreferences;
use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Debug, Deserialize, Serialize, Validate)]
pub struct RegisterUserRequest {
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 8, max = 72))]
    pub password: String,
}

#[derive(Debug, Deserialize, Serialize, Validate)]
pub struct LoginRequest {
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 8, max = 72))]
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
    #[validate(length(min = 8, max = 72))]
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
    #[validate(length(min = 8, max = 72))]
    pub new_password: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct SwitchNetworkRequest {
    pub network: crate::model::network::Network,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateNotificationPreferencesRequest {
    pub notification_preferences: NotificationPreferences,
}
#[derive(Debug, Deserialize, Validate)]
pub struct TerminalCommandRequest {
    #[validate(length(min = 1))]
    pub command: String,
}

#[cfg(test)]
mod password_length_tests {
    use super::*;
    use validator::Validate;

    fn valid_password() -> String {
        "a".repeat(72)
    }

    #[test]
    fn accepts_password_at_72_bytes_for_all_password_requests() {
        let register = RegisterUserRequest {
            email: "user@example.com".into(),
            password: valid_password(),
        };

        let login = LoginRequest {
            email: "user@example.com".into(),
            password: valid_password(),
        };

        let reset = ResetPasswordWithOTPRequest {
            email: "user@example.com".into(),
            otp: "123456".into(),
            new_password: valid_password(),
        };

        let update = UpdatePasswordRequest {
            current_password: "current-password".into(),
            new_password: valid_password(),
        };

        assert!(register.validate().is_ok());
        assert!(login.validate().is_ok());
        assert!(reset.validate().is_ok());
        assert!(update.validate().is_ok());
    }

    #[test]
    fn rejects_password_over_72_bytes_for_all_password_requests() {
        let register = RegisterUserRequest {
            email: "user@example.com".into(),
            password: "a".repeat(73),
        };

        let login = LoginRequest {
            email: "user@example.com".into(),
            password: "a".repeat(73),
        };

        let reset = ResetPasswordWithOTPRequest {
            email: "user@example.com".into(),
            otp: "123456".into(),
            new_password: "a".repeat(73),
        };

        let update = UpdatePasswordRequest {
            current_password: "current-password".into(),
            new_password: "a".repeat(73),
        };

        assert!(register.validate().is_err());
        assert!(login.validate().is_err());
        assert!(reset.validate().is_err());
        assert!(update.validate().is_err());
    }
}
