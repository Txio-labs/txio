use crate::dtos::admin_dtos::{AdminLogEntry, AdminStatsResponse};
use crate::repositories::rpc_repository::RpcRepository;
use crate::repositories::user_repository::UserRepository;
use crate::utils::auth_jwt::Claims;
use crate::utils::error::AppError;

#[derive(Clone)]
pub struct AdminService {
    user_repo: UserRepository,
    rpc_repo: RpcRepository,
    admin_emails: Vec<String>,
}

impl AdminService {
    pub fn new(user_repo: UserRepository, rpc_repo: RpcRepository, admin_emails: Vec<String>) -> Self {
        Self {
            user_repo,
            rpc_repo,
            admin_emails,
        }
    }

    fn is_admin(&self, email: &str) -> bool {
        self.admin_emails
            .iter()
            .any(|admin_email| admin_email.eq_ignore_ascii_case(email))
    }

    fn require_admin(&self, claims: &Claims) -> Result<(), AppError> {
        if self.is_admin(&claims.email) {
            Ok(())
        } else {
            Err(AppError::Forbidden("Admin access required".into()))
        }
    }

    pub async fn list_user_emails(&self, claims: &Claims) -> Result<Vec<String>, AppError> {
        self.require_admin(claims)?;
        self.user_repo.list_all_emails().await
    }

    pub async fn delete_user(&self, claims: &Claims, email: &str) -> Result<String, AppError> {
        self.require_admin(claims)?;

        let user = self.user_repo.find_by_email(email).await?;
        let user_id = user
            .id
            .map(|id| id.to_hex())
            .ok_or_else(|| AppError::InternalError("User ID missing".into()))?;

        let deleted = self.user_repo.delete_by_id(&user_id).await?;
        Ok(deleted.email)
    }

    pub async fn stats(&self, claims: &Claims) -> Result<AdminStatsResponse, AppError> {
        self.require_admin(claims)?;

        let user_count = self.user_repo.count_documents().await?;
        let rpc_log_count = self.rpc_repo.count_all().await?;

        Ok(AdminStatsResponse {
            user_count,
            rpc_log_count,
        })
    }

    pub async fn list_logs(&self, claims: &Claims, limit: i64) -> Result<Vec<AdminLogEntry>, AppError> {
        self.require_admin(claims)?;

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
    use mongodb::Client;

    fn claims_for(email: &str) -> Claims {
        Claims {
            sub: "000000000000000000000000".to_string(),
            email: email.to_string(),
            exp: 0,
            iat: 0,
        }
    }

    // Client construction from a URI only parses connection options; the
    // driver connects lazily on first use, so this never touches the
    // network and is safe to build in unit tests.
    async fn admin_service(admin_emails: Vec<String>) -> AdminService {
        let client = Client::with_uri_str("mongodb://localhost:27017")
            .await
            .expect("parsing a well-formed URI must not require a live connection");
        let db = client.default_database().unwrap_or_else(|| client.database("txio_db"));
        let user_repo = UserRepository::new(&db);
        let rpc_repo = RpcRepository::new(&db);
        AdminService::new(user_repo, rpc_repo, admin_emails)
    }

    #[tokio::test]
    async fn require_admin_accepts_case_insensitive_listed_email() {
        let service = admin_service(vec!["Admin@Example.com".to_string()]).await;
        let claims = claims_for("admin@example.com");
        assert!(service.require_admin(&claims).is_ok());
    }

    #[tokio::test]
    async fn require_admin_rejects_unlisted_email() {
        let service = admin_service(vec!["admin@example.com".to_string()]).await;
        let claims = claims_for("someone-else@example.com");
        assert!(matches!(
            service.require_admin(&claims),
            Err(AppError::Forbidden(_))
        ));
    }

    #[tokio::test]
    async fn require_admin_rejects_when_allowlist_is_empty() {
        let service = admin_service(vec![]).await;
        let claims = claims_for("anyone@example.com");
        assert!(service.require_admin(&claims).is_err());
    }
}
