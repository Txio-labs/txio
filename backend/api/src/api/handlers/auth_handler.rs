use crate::dtos::{
    admin_dtos::RpcLogRequest,
    request::{
        LoginRequest, OTPRequest, RegisterUserRequest, ResetPasswordWithOTPRequest,
        SwitchNetworkRequest, UpdateEmailRequest, UpdatePasswordRequest, VerifyOTPRequest,
    },
    response::{AuthResponse, UserResponse},
};
use crate::services::auth_service::AuthService;
use crate::utils::error::AppError;
use axum::{Json, extract::State};
use serde_json::{Value, json};

pub async fn register(
    State(service): State<AuthService>,
    Json(payload): Json<RegisterUserRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    use validator::Validate;
    payload
        .validate()
        .map_err(|e| AppError::ValidationError(e.to_string()))?;

    let response = service.register_user(payload).await?;

    Ok(Json(response))
}

pub async fn login(
    State(service): State<AuthService>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    use validator::Validate;
    payload
        .validate()
        .map_err(|e| AppError::ValidationError(e.to_string()))?;

    let response = service.login_user(payload).await?;

    Ok(Json(response))
}

pub async fn request_otp(
    State(service): State<AuthService>,
    Json(payload): Json<OTPRequest>,
) -> Result<Json<Value>, AppError> {
    use validator::Validate;
    payload
        .validate()
        .map_err(|e| AppError::ValidationError(e.to_string()))?;

    service.request_otp(payload.email).await?;

    Ok(Json(json!({ "message": "OTP sent successfully" })))
}

pub async fn verify_otp(
    State(service): State<AuthService>,
    Json(payload): Json<VerifyOTPRequest>,
) -> Result<Json<Value>, AppError> {
    use validator::Validate;
    payload
        .validate()
        .map_err(|e| AppError::ValidationError(e.to_string()))?;

    let is_valid = service.verify_otp(payload.email, payload.otp).await?;

    if !is_valid {
        return Err(AppError::BadRequest("Invalid or expired OTP".into()));
    }

    Ok(Json(json!({ "message": "OTP verified successfully" })))
}

pub async fn profile(
    State(service): State<AuthService>,
    claims: crate::utils::auth_jwt::Claims,
) -> Result<Json<UserResponse>, AppError> {
    let user = service.get_user_profile_by_email(&claims.email).await?;

    Ok(Json(user))
}

pub async fn logout() -> Result<Json<Value>, AppError> {
    Ok(Json(json!({ "message": "Logged out successfully" })))
}

pub async fn get_user_profile(
    State(service): State<AuthService>,
    Json(payload): Json<OTPRequest>,
) -> Result<Json<Value>, AppError> {
    use validator::Validate;
    payload
        .validate()
        .map_err(|e| AppError::ValidationError(e.to_string()))?;

    let user = service.get_user_profile_by_email(&payload.email).await?;

    Ok(Json(json!({ "user": user })))
}

pub async fn update_user_email(
    State(service): State<AuthService>,
    Json(payload): Json<UpdateEmailRequest>,
) -> Result<Json<Value>, AppError> {
    use validator::Validate;
    payload
        .validate()
        .map_err(|e| AppError::ValidationError(e.to_string()))?;

    let user = service
        .update_user_email_by_email(&payload.old_email, &payload.new_email)
        .await?;

    Ok(Json(json!({ "user": user })))
}

pub async fn update_user_password(
    State(service): State<AuthService>,
    Json(payload): Json<UpdatePasswordRequest>,
) -> Result<Json<Value>, AppError> {
    use validator::Validate;
    payload
        .validate()
        .map_err(|e| AppError::ValidationError(e.to_string()))?;

    let user = service
        .update_user_password_by_email(&payload.email, &payload.new_password)
        .await?;

    Ok(Json(json!({ "user": user })))
}

pub async fn delete_user(
    State(service): State<AuthService>,
    Json(payload): Json<OTPRequest>,
) -> Result<Json<Value>, AppError> {
    use validator::Validate;
    payload
        .validate()
        .map_err(|e| AppError::ValidationError(e.to_string()))?;

    let user = service.delete_user_by_email(&payload.email).await?;

    Ok(Json(json!({ "user": user })))
}

pub async fn forgot_password(
    State(service): State<AuthService>,
    Json(payload): Json<OTPRequest>,
) -> Result<Json<Value>, AppError> {
    use validator::Validate;
    payload
        .validate()
        .map_err(|e| AppError::ValidationError(e.to_string()))?;

    service.request_otp(payload.email).await?;

    Ok(Json(
        json!({ "message": "OTP for password reset sent successfully" }),
    ))
}

pub async fn reset_password_with_otp(
    State(service): State<AuthService>,
    Json(payload): Json<ResetPasswordWithOTPRequest>,
) -> Result<Json<Value>, AppError> {
    use validator::Validate;
    payload
        .validate()
        .map_err(|e| AppError::ValidationError(e.to_string()))?;

    service
        .reset_password_with_otp(&payload.email, &payload.otp, &payload.new_password)
        .await?;

    Ok(Json(json!({ "message": "Password reset successfully" })))
}

pub async fn log_rpc_call(
    State(service): State<AuthService>,
    claims: crate::utils::auth_jwt::Claims,
    Json(payload): Json<RpcLogRequest>,
) -> Result<Json<Value>, AppError> {
    use mongodb::bson::oid::ObjectId;
    use std::str::FromStr;
    use validator::Validate;

    payload
        .validate()
        .map_err(|e| AppError::ValidationError(e.to_string()))?;

    let user_id = ObjectId::from_str(&claims.sub)
        .map_err(|_| AppError::InternalError("Invalid user ID in token".into()))?;

    service.log_rpc_call(user_id, payload).await?;

    Ok(Json(json!({ "message": "RPC call logged" })))
}

pub async fn switch_network(
    State(service): State<AuthService>,
    claims: crate::utils::auth_jwt::Claims,
    Json(payload): Json<SwitchNetworkRequest>,
) -> Result<Json<Value>, AppError> {
    use mongodb::bson::oid::ObjectId;
    use std::str::FromStr;

    let user_id = ObjectId::from_str(&claims.sub)
        .map_err(|_| AppError::InternalError("Invalid user ID in token".into()))?;

    let user = service
        .update_user_network(user_id, payload.network)
        .await?;

    Ok(Json(json!({
        "message": "Network switched successfully",
        "user": user
    })))
}

#[derive(serde::Deserialize)]
pub struct OAuthCallbackQuery {
    pub code: String,
}

pub async fn google_login() -> Result<axum::response::Redirect, AppError> {
    let client_id = std::env::var("GOOGLE_CLIENT_ID").unwrap_or_default();
    if client_id.trim().is_empty() {
        return Err(AppError::BadRequest(
            "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.".into(),
        ));
    }
    let redirect_uri = std::env::var("GOOGLE_REDIRECT_URL")
        .unwrap_or_else(|_| "http://localhost:8000/api/v1/auth/google/callback".to_string());

    let url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?client_id={}&redirect_uri={}&response_type=code&scope=email profile",
        client_id, redirect_uri
    );
    Ok(axum::response::Redirect::temporary(&url))
}

pub async fn google_callback(
    State(service): State<AuthService>,
    axum::extract::Query(query): axum::extract::Query<OAuthCallbackQuery>,
) -> Result<axum::response::Redirect, AppError> {
    let client_id = std::env::var("GOOGLE_CLIENT_ID").unwrap_or_default();
    let client_secret = std::env::var("GOOGLE_CLIENT_SECRET").unwrap_or_default();
    if client_id.trim().is_empty() || client_secret.trim().is_empty() {
        return Err(AppError::BadRequest(
            "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.".into(),
        ));
    }
    let redirect_uri = std::env::var("GOOGLE_REDIRECT_URL")
        .unwrap_or_else(|_| "http://localhost:8000/api/v1/auth/google/callback".to_string());
    let frontend_url =
        std::env::var("FRONTEND_URL").unwrap_or_else(|_| "http://localhost:3000".to_string());

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());
    let token_res = client
        .post("https://oauth2.googleapis.com/token")
        .form(&[
            ("client_id", client_id.as_str()),
            ("client_secret", client_secret.as_str()),
            ("code", query.code.as_str()),
            ("grant_type", "authorization_code"),
            ("redirect_uri", redirect_uri.as_str()),
        ])
        .send()
        .await
        .map_err(|_| AppError::InternalError("Failed to get Google token".into()))?;

    let token_data: Value = token_res
        .json()
        .await
        .map_err(|_| AppError::InternalError("Failed to parse Google token".into()))?;
    let access_token = token_data["access_token"]
        .as_str()
        .ok_or(AppError::InternalError("No access token".into()))?;

    let user_res = client
        .get("https://www.googleapis.com/oauth2/v2/userinfo")
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|_| AppError::InternalError("Failed to get Google user info".into()))?;

    let user_data: Value = user_res
        .json()
        .await
        .map_err(|_| AppError::InternalError("Failed to parse Google user info".into()))?;
    let email = user_data["email"]
        .as_str()
        .ok_or(AppError::InternalError("No email in Google profile".into()))?;

    let auth_res = service.oauth_login_or_register(email.to_string()).await?;

    // Pass the JWT back to the frontend as a query param so the SPA can
    // pick it up, store it, and route the user into the app.
    let redirect_to = format!(
        "{}/?token={}",
        frontend_url.trim_end_matches('/'),
        auth_res.token
    );

    Ok(axum::response::Redirect::temporary(&redirect_to))
}
