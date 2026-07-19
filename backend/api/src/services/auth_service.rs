use crate::dtos::admin_dtos::RpcLogRequest;
use crate::dtos::request::{LoginRequest, RegisterUserRequest};
use crate::dtos::response::{AuthResponse, UserResponse};
use crate::model::rpc::RpcLog;
use crate::model::user::{NotificationPreferences, User};
use crate::repositories::rpc_repository::RpcRepository;
use crate::repositories::user_repository::UserRepository;
use crate::services::email_service::EmailService;
use crate::services::otp_service::OTPService;
use crate::utils::auth_jwt::JwtHelper;
use crate::utils::error::AppError;

#[derive(Clone)]
pub struct AuthService {
    repo: UserRepository,
    rpc_repo: RpcRepository,
    jwt_helper: JwtHelper,
    otp_service: OTPService,
    email_service: EmailService,
}

impl AuthService {
    fn to_user_response(user: &User) -> UserResponse {
        let name = user.email.split('@').next().unwrap_or("user").to_string();

        UserResponse {
            id: user
                .id
                .as_ref()
                .map(|id| id.to_string())
                .unwrap_or_default(),
            name,
            email: user.email.clone(),
            created_at: user.created_at.to_string(),
            notification_preferences: user.notification_preferences.clone(),
        }
    }

    pub fn new(
        repo: UserRepository,
        rpc_repo: RpcRepository,
        jwt_helper: JwtHelper,
        otp_service: OTPService,
        email_service: EmailService,
    ) -> Self {
        Self {
            repo,
            rpc_repo,
            jwt_helper,
            otp_service,
            email_service,
        }
    }

    pub async fn request_otp(&self, email: String) -> Result<(), AppError> {
        // 1. Check if user exists (optional, but good for security or UX)
        // For now, let's assume we allow requesting OTP for any email (e.g., for registration)

        // 2. Generate OTP
        let otp = self.otp_service.generate_otp(&email).await?;

        // 3. Send Email
        self.email_service.send_otp_email(&email, &otp).await?;

        Ok(())
    }

    pub async fn verify_otp(&self, email: String, code: String) -> Result<bool, AppError> {
        self.otp_service.verify_otp(&email, &code).await
    }

    pub async fn register_user(&self, req: RegisterUserRequest) -> Result<AuthResponse, AppError> {
        // Check if email already exists
        match self.repo.find_by_email(&req.email).await {
            Ok(_) => return Err(AppError::BadRequest("Email already registered".into())),
            Err(AppError::NotFound(_)) => (),
            Err(e) => return Err(e),
        };

        // Hash password before storage
        let password_hash = bcrypt::hash(req.password.as_bytes(), bcrypt::DEFAULT_COST)
            .map_err(|_| AppError::InternalError("Failed to hash password".into()))?;

        let new_user = User::new(req.email, password_hash);

        let saved_user = self.repo.save(&new_user).await?;

        let token = self.jwt_helper.generate_token(
            &saved_user.id.map(|id| id.to_string()).unwrap_or_default(),
            &saved_user.email,
        )?;

        Ok(AuthResponse {
            token,
            user: Self::to_user_response(&saved_user),
        })
    }

    pub async fn login_user(&self, req: LoginRequest) -> Result<AuthResponse, AppError> {
        // Dummy hash for timing-safe comparison when user is not found.
        // This ensures both "user not found" and "wrong password" paths take comparable time,
        // preventing timing side-channel attacks for user enumeration.
        // Hash of a random string, cost factor matches DEFAULT_COST (12).
        const DUMMY_HASH: &str = "$2b$12$K4IzU6d5TqmqRKFLJZdqOeVLqZJ3mJHvJZdqOeVLqZJ3mJHvJZdq.";

        let user_result = self.repo.find_by_email(&req.email).await;

        let (hash_to_verify, user_found) = match &user_result {
            Ok(user) => (user.password_hash.as_str(), true),
            Err(_) => (DUMMY_HASH, false),
        };

        // Always perform bcrypt verification to ensure constant-time behavior
        let is_valid = bcrypt::verify(req.password.as_bytes(), hash_to_verify).unwrap_or(false);

        // Return error if user wasn't found or password was invalid
        if !user_found || !is_valid {
            return Err(AppError::Unauthorized("Invalid credentials".into()));
        }

        let user = user_result.unwrap();

        let token = self.jwt_helper.generate_token(
            &user.id.map(|id| id.to_string()).unwrap_or_default(),
            &user.email,
        )?;

        Ok(AuthResponse {
            token,
            user: Self::to_user_response(&user),
        })
    }

    pub async fn get_user_profile_by_email(&self, email: &str) -> Result<UserResponse, AppError> {
        let user = self.repo.find_by_email(email).await?;

        Ok(Self::to_user_response(&user))
    }

    pub async fn delete_user_by_email(&self, email: &str) -> Result<UserResponse, AppError> {
        let user = self.repo.find_by_email(email).await?;
        let user_id = user
            .id
            .map(|id| id.to_string())
            .ok_or(AppError::InternalError("User ID missing".into()))?;
        let deleted_user = self.repo.delete_by_id(&user_id).await?;

        Ok(Self::to_user_response(&deleted_user))
    }

    pub async fn update_user_email_by_email(
        &self,
        old_email: &str,
        new_email: &str,
    ) -> Result<UserResponse, AppError> {
        let mut user = self.repo.find_by_email(old_email).await?;
        user.email = new_email.to_string();

        let updated_user = self.repo.update(&user).await?;

        Ok(Self::to_user_response(&updated_user))
    }

    pub async fn update_notification_preferences_by_email(
        &self,
        email: &str,
        preferences: NotificationPreferences,
    ) -> Result<UserResponse, AppError> {
        let mut user = self.repo.find_by_email(email).await?;
        user.notification_preferences = preferences;

        let updated_user = self.repo.update(&user).await?;

        Ok(Self::to_user_response(&updated_user))
    }

    pub async fn update_user_password_by_email(
        &self,
        email: &str,
        current_password: &str,
        new_password: &str,
    ) -> Result<UserResponse, AppError> {
        let mut user = self.repo.find_by_email(email).await?;

        verify_current_password(current_password, &user.password_hash)?;

        // Hash new password
        let password_hash = bcrypt::hash(new_password.as_bytes(), bcrypt::DEFAULT_COST)
            .map_err(|_| AppError::InternalError("Failed to hash password".into()))?;

        user.password_hash = password_hash;

        let updated_user = self.repo.update(&user).await?;

        Ok(Self::to_user_response(&updated_user))
    }

    pub async fn reset_password_with_otp(
        &self,
        email: &str,
        otp: &str,
        new_password: &str,
    ) -> Result<(), AppError> {
        // 1. Verify OTP
        let is_valid = self.otp_service.verify_otp(email, otp).await?;
        if !is_valid {
            return Err(AppError::BadRequest("Invalid or expired OTP".into()));
        }

        // 2. Find user
        let mut user = self.repo.find_by_email(email).await?;

        // 3. Hash new password
        let password_hash = bcrypt::hash(new_password.as_bytes(), bcrypt::DEFAULT_COST)
            .map_err(|_| AppError::InternalError("Failed to hash password".into()))?;

        // 4. Update user
        user.password_hash = password_hash;
        self.repo.update(&user).await?;

        Ok(())
    }

    pub async fn log_rpc_call(
        &self,
        user_id: mongodb::bson::oid::ObjectId,
        req: RpcLogRequest,
    ) -> Result<(), AppError> {
        let log = RpcLog::new(user_id, req.method, req.params, req.success, req.error);
        self.rpc_repo.save(&log).await
    }

    pub async fn get_rpc_history(&self, email: &str) -> Result<Vec<RpcLog>, AppError> {
        let user = self.repo.find_by_email(email).await?;

        if let Some(user_id) = user.id {
            let logs = self.rpc_repo.find_by_user_id(user_id).await?;
            Ok(logs)
        } else {
            // Should be rare given user exists
            Ok(vec![])
        }
    }

    pub async fn update_user_network(
        &self,
        user_id: mongodb::bson::oid::ObjectId,
        network: crate::model::user::SuiNetwork,
    ) -> Result<UserResponse, AppError> {
        let mut user = self.repo.find_by_id(&user_id).await?;
        user.network = network;

        let updated_user = self.repo.update(&user).await?;

        Ok(Self::to_user_response(&updated_user))
    }

    pub async fn oauth_login_or_register(
        &self,
        google_sub: String,
        email: String,
    ) -> Result<AuthResponse, AppError> {
        let user_by_sub = self.repo.find_by_google_sub(&google_sub).await.ok();
        let user_by_email = self.repo.find_by_email(&email).await.ok();

        let user = resolve_oauth_account(google_sub, email, user_by_sub, user_by_email)?;

        let user = match user {
            OAuthAccountResolution::Login(existing) => existing,
            OAuthAccountResolution::Register { email, google_sub } => {
                let random_password = uuid::Uuid::new_v4().to_string();
                let password_hash = bcrypt::hash(random_password.as_bytes(), bcrypt::DEFAULT_COST)
                    .map_err(|_| AppError::InternalError("Failed to hash password".into()))?;

                let new_user = User::new_oauth(email, password_hash, google_sub);
                self.repo.save(&new_user).await?
            }
        };

        let token = self.jwt_helper.generate_token(
            &user.id.map(|id| id.to_string()).unwrap_or_default(),
            &user.email,
        )?;

        Ok(AuthResponse {
            token,
            user: Self::to_user_response(&user),
        })
    }
}

fn verify_current_password(current_password: &str, password_hash: &str) -> Result<(), AppError> {
    let is_valid = bcrypt::verify(current_password.as_bytes(), password_hash).unwrap_or(false);

    if !is_valid {
        return Err(AppError::Unauthorized(
            "Current password is incorrect".into(),
        ));
    }

    Ok(())
}

enum OAuthAccountResolution {
    Login(User),
    Register { email: String, google_sub: String },
}

fn resolve_oauth_account(
    google_sub: String,
    email: String,
    user_by_sub: Option<User>,
    user_by_email: Option<User>,
) -> Result<OAuthAccountResolution, AppError> {
    if let Some(user) = user_by_sub {
        return Ok(OAuthAccountResolution::Login(user));
    }

    if let Some(user) = user_by_email {
        match user.google_sub.as_deref() {
            Some(existing) if existing == google_sub => Ok(OAuthAccountResolution::Login(user)),
            Some(_) => Err(AppError::Unauthorized(
                "This Google account is not linked to the existing user".into(),
            )),
            None => Err(AppError::Forbidden(
                "An account with this email already exists. Sign in with your password to link Google.".into(),
            )),
        }
    } else {
        Ok(OAuthAccountResolution::Register { email, google_sub })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn verify_current_password_rejects_mismatched_password() {
        let password_hash = bcrypt::hash(b"correct-password", bcrypt::DEFAULT_COST).unwrap();

        let result = verify_current_password("wrong-password", &password_hash);

        assert!(matches!(result, Err(AppError::Unauthorized(_))));
    }

    #[test]
    fn verify_current_password_accepts_matching_password() {
        let password_hash = bcrypt::hash(b"correct-password", bcrypt::DEFAULT_COST).unwrap();

        let result = verify_current_password("correct-password", &password_hash);

        assert!(result.is_ok());
    }
}

#[cfg(test)]
mod oauth_tests {
    use super::*;
    use chrono::Utc;
    use mongodb::bson::oid::ObjectId;

    fn sample_user(email: &str, google_sub: Option<&str>) -> User {
        User {
            id: Some(ObjectId::new()),
            email: email.to_string(),
            password_hash: "hash".to_string(),
            google_sub: google_sub.map(str::to_string),
            tier: crate::model::user::PlanTier::Free,
            network: crate::model::user::SuiNetwork::Mainnet,
            created_at: Utc::now(),
        }
    }

    #[test]
    fn logs_in_when_google_sub_matches() {
        let user = sample_user("user@example.com", Some("google-sub-123"));
        let result = resolve_oauth_account(
            "google-sub-123".to_string(),
            "user@example.com".to_string(),
            Some(user.clone()),
            None,
        )
        .unwrap();

        match result {
            OAuthAccountResolution::Login(found) => assert_eq!(found.email, user.email),
            OAuthAccountResolution::Register { .. } => panic!("expected login"),
        }
    }

    #[test]
    fn rejects_unlinked_password_account_with_matching_email() {
        let user = sample_user("victim@example.com", None);
        let result = resolve_oauth_account(
            "attacker-sub".to_string(),
            "victim@example.com".to_string(),
            None,
            Some(user),
        );

        assert!(matches!(result, Err(AppError::Forbidden(_))));
    }

    #[test]
    fn registers_new_oauth_user_when_email_is_unknown() {
        let result = resolve_oauth_account(
            "new-sub".to_string(),
            "new@example.com".to_string(),
            None,
            None,
        )
        .unwrap();

        match result {
            OAuthAccountResolution::Register { email, google_sub } => {
                assert_eq!(email, "new@example.com");
                assert_eq!(google_sub, "new-sub");
            }
            OAuthAccountResolution::Login(_) => panic!("expected register"),
        }
    }

    #[test]
    fn rejects_conflicting_google_sub_for_existing_email() {
        let user = sample_user("user@example.com", Some("linked-sub"));
        let result = resolve_oauth_account(
            "different-sub".to_string(),
            "user@example.com".to_string(),
            None,
            Some(user),
        );

        assert!(matches!(result, Err(AppError::Unauthorized(_))));
    }
}
