use crate::dtos::admin_dtos::{AdminLogEntry, AdminStatsResponse};
use crate::model::user::User;
use crate::repositories::rpc_repository::RpcRepository;
use crate::repositories::user_repository::UserRepository;
use crate::utils::auth_jwt::Claims;
use crate::utils::error::AppError;
use mongodb::bson::oid::ObjectId;

#[derive(Clone)]
pub struct AdminService {
    user_repo: UserRepository,
    rpc_repo: RpcRepository,
}

impl AdminService {
    pub fn new(user_repo: UserRepository, rpc_repo: RpcRepository) -> Self {
        Self {
            user_repo,
            rpc_repo,
        }
    }

    /// Admin access is granted solely by the durable `User.is_admin` flag.
    /// Email allowlist matching against JWT claims is intentionally not used.
    pub(crate) fn ensure_admin_flag(user: &User) -> Result<(), AppError> {
        if user.is_admin {
            Ok(())
        } else {
            Err(AppError::Forbidden("Admin access required".into()))
        }
    }

    async fn require_admin(&self, claims: &Claims) -> Result<(), AppError> {
        let oid = ObjectId::parse_str(&claims.sub)
            .map_err(|_| AppError::Unauthorized("Invalid token subject".into()))?;
        let user = self.user_repo.find_by_id(&oid).await?;
        Self::ensure_admin_flag(&user)
    }

    pub async fn list_user_emails(&self, claims: &Claims) -> Result<Vec<String>, AppError> {
        self.require_admin(claims).await?;
        self.user_repo.list_all_emails().await
    }

    pub async fn delete_user(&self, claims: &Claims, email: &str) -> Result<String, AppError> {
        self.require_admin(claims).await?;

        let user = self.user_repo.find_by_email(email).await?;
        let user_id = user
            .id
            .map(|id| id.to_hex())
            .ok_or_else(|| AppError::InternalError("User ID missing".into()))?;

        let deleted = self.user_repo.delete_by_id(&user_id).await?;
        Ok(deleted.email)
    }

    pub async fn stats(&self, claims: &Claims) -> Result<AdminStatsResponse, AppError> {
        self.require_admin(claims).await?;

        let user_count = self.user_repo.count_documents().await?;
        let rpc_log_count = self.rpc_repo.count_all().await?;

        Ok(AdminStatsResponse {
            user_count,
            rpc_log_count,
        })
    }

    pub async fn list_logs(
        &self,
        claims: &Claims,
        limit: i64,
    ) -> Result<Vec<AdminLogEntry>, AppError> {
        self.require_admin(claims).await?;

        let logs = self.rpc_repo.find_recent(limit).await?;
        Ok(logs
            .into_iter()
            .map(|log| AdminLogEntry {
                method: log.method,
                success: log.success,
                error: log.error,
                timestamp: log.timestamp.to_rfc3339(),
            })
            .collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::user::User;

    fn sample_user(is_admin: bool) -> User {
        let mut user = User::new("admin@example.com".into(), "hash".into());
        user.is_admin = is_admin;
        user
    }

    #[test]
    fn ensure_admin_flag_accepts_admin_user() {
        assert!(AdminService::ensure_admin_flag(&sample_user(true)).is_ok());
    }

    #[test]
    fn ensure_admin_flag_rejects_non_admin_user() {
        assert!(matches!(
            AdminService::ensure_admin_flag(&sample_user(false)),
            Err(AppError::Forbidden(_))
        ));
    }

    #[test]
    fn ensure_admin_flag_ignores_email_string() {
        // Even with an "admin-looking" email, privilege requires the flag.
        let user = User::new("admin@txio.io".into(), "hash".into());
        assert!(AdminService::ensure_admin_flag(&user).is_err());
    }
}
