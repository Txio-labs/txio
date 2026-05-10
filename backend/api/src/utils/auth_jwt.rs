use jsonwebtoken::{encode, decode, Header, Validation, EncodingKey, DecodingKey};
use serde::{Deserialize, Serialize};
use chrono::{Utc, Duration};
use crate::utils::error::AppError;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,  // user_id
    pub email: String,
    pub exp: i64,     // expiration timestamp
    pub iat: i64,     // issued at
}

#[derive(Clone)]
pub struct JwtHelper {
    secret: String,
}

impl JwtHelper {
    pub fn new(secret: String) -> Self {
        Self { secret }
    }
    
    pub fn generate_token(&self, user_id: &str, email: &str) -> Result<String, AppError> {
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
        };
        
        encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(self.secret.as_bytes())
        ).map_err(|e| AppError::InternalError(format!("Failed to generate token: {}", e)))
    }
    
    pub fn verify_token(&self, token: &str) -> Result<Claims, AppError> {
        decode::<Claims>(
            token,
            &DecodingKey::from_secret(self.secret.as_bytes()),
            &Validation::default()
        )
        .map(|data| data.claims)
        .map_err(|_| AppError::Unauthorized("Invalid token".to_string()))
    }
}

use axum::{
    async_trait,
    extract::FromRequestParts,
    http::request::Parts,
};
use crate::utils::config::Config;

#[async_trait]
impl<S> FromRequestParts<S> for Claims
where
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        // Extract the token from the authorization header
        let auth_header = parts.headers
            .get(axum::http::header::AUTHORIZATION)
            .and_then(|value| value.to_str().ok())
            .ok_or_else(|| AppError::Unauthorized("Missing authorization header".to_string()))?;

        if !auth_header.starts_with("Bearer ") {
            return Err(AppError::Unauthorized("Invalid authorization header format".to_string()));
        }

        let token = &auth_header[7..];

        // We need the secret to verify the token. 
        // In a real app, you might want to get this from the state.
        // For simplicity, we'll try to get it from environment/config if possible,
        // but it's better to use state.
        
        // Since we don't have easy access to state here without specific types,
        // and JwtHelper is usually in the state, let's assume we can get it from Config for now
        // OR we can make a dedicated extractor that uses State.
        
        let config = Config::from_env().map_err(|_| AppError::InternalError("Config error".into()))?;
        let helper = JwtHelper::new(config.jwt_secret);
        
        helper.verify_token(token)
    }
}
