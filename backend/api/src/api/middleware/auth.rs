use axum::{http::{header, StatusCode, Request}, middleware::Next, response::IntoResponse};
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde_json::Value;

/// Simple JWT authentication middleware.
/// Expects `Authorization: Bearer <token>` header.
/// Validates the token using the secret in `JWT_SECRET` environment variable.
/// If validation fails, returns `401 Unauthorized`.
pub async fn auth_middleware<B>(request: Request<B>, next: Next<B>) -> impl IntoResponse {
    // Extract the Authorization header
    if let Some(auth_header) = request.headers().get(header::AUTHORIZATION) {
        if let Ok(auth_str) = auth_header.to_str() {
            if let Some(token) = auth_str.strip_prefix("Bearer ") {
                let secret = std::env::var("JWT_SECRET").unwrap_or_default();
                if !secret.is_empty() {
                    let decoding_key = DecodingKey::from_secret(secret.as_bytes());
                    let validation = Validation::default();
                    if decode::<Value>(token, &decoding_key, &validation).is_ok() {
                        // Token valid – continue to handler
                        return next.run(request).await;
                    }
                }
            }
        }
    }
    // Authentication failed
    (StatusCode::UNAUTHORIZED, "Unauthorized")
}
