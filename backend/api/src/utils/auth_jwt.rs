use crate::utils::error::AppError;
use chrono::{Duration, Utc};
use jsonwebtoken::{DecodingKey, EncodingKey, Header, Validation, decode, encode};
use mongodb::bson::doc;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String, // user_id
    pub email: String,
    pub exp: i64, // expiration timestamp
    pub iat: i64, // issued at
    #[serde(default)]
    pub token_version: u32,
}

#[derive(Clone)]
pub struct JwtHelper {
    secret: String,
}

impl JwtHelper {
    pub fn new(secret: String) -> Self {
        Self { secret }
    }

    pub fn generate_token(
        &self,
        user_id: &str,
        email: &str,
        token_version: u32,
    ) -> Result<String, AppError> {
        let now = Utc::now();
        let expiration = now + Duration::hours(24);

        // Ensure expiration is valid
        if expiration.timestamp() < now.timestamp() {
            return Err(AppError::InternalError("Invalid token expiration".into()));
        }

        let claims = Claims {
            sub: user_id.to_string(),
            email: email.to_string(),
            exp: expiration.timestamp(),
            iat: now.timestamp(),
            token_version,
        };

        encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(self.secret.as_bytes()),
        )
        .map_err(|e| AppError::InternalError(format!("Failed to generate token: {}", e)))
    }

    pub fn verify_token(&self, token: &str) -> Result<Claims, AppError> {
        decode::<Claims>(
            token,
            &DecodingKey::from_secret(self.secret.as_bytes()),
            &Validation::default(),
        )
        .map(|data| data.claims)
        .map_err(|_| AppError::Unauthorized("Invalid token".to_string()))
    }
}

use crate::utils::config::Config;
use axum::{async_trait, extract::FromRequestParts, http::request::Parts};

#[async_trait]
impl<S> FromRequestParts<S> for Claims
where
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let auth_header = parts
            .headers
            .get(axum::http::header::AUTHORIZATION)
            .and_then(|value| value.to_str().ok())
            .ok_or_else(|| AppError::Unauthorized("Missing authorization header".to_string()))?;

        if !auth_header.starts_with("Bearer ") {
            return Err(AppError::Unauthorized(
                "Invalid authorization header format".to_string(),
            ));
        }

        let token = &auth_header[7..];

        let config =
            Config::from_env().map_err(|_| AppError::InternalError("Config error".into()))?;
        let helper = JwtHelper::new(config.jwt_secret);

        let claims = helper.verify_token(token)?;

        // Validate token_version against the database to support revocation
        let db_client = parts
            .extensions
            .get::<mongodb::Client>()
            .ok_or_else(|| AppError::InternalError("Database not available".into()))?;

        let collection: mongodb::Collection<crate::model::user::User> =
            db_client.database("txio_db").collection("users");

        let user_id = mongodb::bson::oid::ObjectId::parse_str(&claims.sub)
            .map_err(|_| AppError::Unauthorized("Invalid token".to_string()))?;

        let user = collection
            .find_one(doc! { "_id": user_id }, None)
            .await
            .map_err(|_| AppError::InternalError("Failed to look up user".into()))?
            .ok_or_else(|| AppError::Unauthorized("Invalid token".to_string()))?;

        if user.token_version != claims.token_version {
            return Err(AppError::Unauthorized("Token has been revoked".to_string()));
        }

        Ok(claims)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn helper() -> JwtHelper {
        JwtHelper::new("test-secret-must-be-at-least-32-chars!!".to_string())
    }

    #[test]
    fn generate_token_includes_token_version() {
        let h = helper();
        let token = h.generate_token("user1", "a@b.com", 5).unwrap();
        let claims = h.verify_token(&token).unwrap();
        assert_eq!(claims.token_version, 5);
        assert_eq!(claims.sub, "user1");
        assert_eq!(claims.email, "a@b.com");
    }

    #[test]
    fn token_version_zero_is_valid() {
        let h = helper();
        let token = h.generate_token("u", "e@e.com", 0).unwrap();
        let claims = h.verify_token(&token).unwrap();
        assert_eq!(claims.token_version, 0);
    }

    #[test]
    fn verify_rejects_wrong_secret() {
        let h1 = JwtHelper::new("secret-key-aaaaaaaaaaaaaaaaaaaaa".to_string());
        let h2 = JwtHelper::new("secret-key-bbbbbbbbbbbbbbbbbbbbb".to_string());
        let token = h1.generate_token("u", "e@e.com", 1).unwrap();
        assert!(h2.verify_token(&token).is_err());
    }

    #[test]
    fn claims_roundtrip_preserves_token_version() {
        let h = helper();
        let original = Claims {
            sub: "abc".into(),
            email: "x@y.com".into(),
            exp: (Utc::now() + Duration::hours(1)).timestamp(),
            iat: Utc::now().timestamp(),
            token_version: 42,
        };
        let token = encode(
            &Header::default(),
            &original,
            &EncodingKey::from_secret(h.secret.as_bytes()),
        )
        .unwrap();
        let decoded = h.verify_token(&token).unwrap();
        assert_eq!(decoded.token_version, 42);
    }

    #[test]
    fn user_missing_token_version_deserialises_as_zero() {
        let json = r#"{"email":"a@b.com","password_hash":"$2b$12$...","tier":"Free","created_at":"2024-01-01T00:00:00Z"}"#;
        let user: crate::model::user::User = serde_json::from_str(json).unwrap();
        assert_eq!(user.token_version, 0);
    }
}
