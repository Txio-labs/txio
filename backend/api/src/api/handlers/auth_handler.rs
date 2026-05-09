use axum::{extract::State, Json};
use crate::services::auth_service::AuthService;
use crate::dtos::{request::{RegisterUserRequest, LoginRequest, OTPRequest, VerifyOTPRequest, ResetPasswordWithOTPRequest, UpdateEmailRequest, UpdatePasswordRequest, SwitchNetworkRequest}, response::AuthResponse};
use crate::utils::error::AppError;
use serde_json::{json, Value};

pub async fn register(
    State(service): State<AuthService>,
    Json(payload): Json<RegisterUserRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    use validator::Validate;
    payload.validate()
        .map_err(|e| AppError::ValidationError(e.to_string()))?;

    let response = service.register_user(payload).await?;
    
    Ok(Json(response))
}

pub async fn login(
    State(service): State<AuthService>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    use validator::Validate;
    payload.validate()
        .map_err(|e| AppError::ValidationError(e.to_string()))?;

    let response = service.login_user(payload).await?;
    
    Ok(Json(response))
}

pub async fn request_otp(
    State(service): State<AuthService>,
    Json(payload): Json<OTPRequest>,
) -> Result<Json<Value>, AppError> {
    use validator::Validate;
    payload.validate()
        .map_err(|e| AppError::ValidationError(e.to_string()))?;

    service.request_otp(payload.email).await?;

    Ok(Json(json!({ "message": "OTP sent successfully" })))
}

pub async fn verify_otp(
    State(service): State<AuthService>,
    Json(payload): Json<VerifyOTPRequest>,
) -> Result<Json<Value>, AppError> {
    use validator::Validate;
    payload.validate()
        .map_err(|e| AppError::ValidationError(e.to_string()))?;

    let is_valid = service.verify_otp(payload.email, payload.otp).await?;

    if !is_valid {
        return Err(AppError::BadRequest("Invalid or expired OTP".into()));
    }

    Ok(Json(json!({ "message": "OTP verified successfully" })))
}

pub async fn profile(
    claims: crate::utils::auth_jwt::Claims,
) -> Result<String, AppError> {
    Ok(format!("Welcome, user {}! Your email is {}.", claims.sub, claims.email))
}

pub async fn logout() -> Result<Json<Value>, AppError> {
    Ok(Json(json!({ "message": "Logged out successfully" })))
}

pub async fn get_user_profile(
    State(service): State<AuthService>,
    Json(payload): Json<OTPRequest>,
) -> Result<Json<Value>, AppError> {
    use validator::Validate;
    payload.validate()
        .map_err(|e| AppError::ValidationError(e.to_string()))?;

    let user = service.get_user_profile_by_email(&payload.email).await?;

    Ok(Json(json!({ "user": user })))
}

pub async fn update_user_email(
    State(service): State<AuthService>,
    Json(payload): Json<UpdateEmailRequest>,
) -> Result<Json<Value>, AppError> {
    use validator::Validate;
    payload.validate()
        .map_err(|e| AppError::ValidationError(e.to_string()))?;

    let user = service.update_user_email_by_email(&payload.old_email, &payload.new_email).await?;

    Ok(Json(json!({ "user": user })))
}

pub async fn update_user_password(
    State(service): State<AuthService>,
    Json(payload): Json<UpdatePasswordRequest>,
) -> Result<Json<Value>, AppError> {
    use validator::Validate;
    payload.validate()
        .map_err(|e| AppError::ValidationError(e.to_string()))?;

    let user = service.update_user_password_by_email(&payload.email, &payload.new_password).await?;

    Ok(Json(json!({ "user": user })))
}

pub async fn delete_user(
    State(service): State<AuthService>,
    Json(payload): Json<OTPRequest>,
) -> Result<Json<Value>, AppError> {
    use validator::Validate;
    payload.validate()
        .map_err(|e| AppError::ValidationError(e.to_string()))?;

    let user = service.delete_user_by_email(&payload.email).await?;

    Ok(Json(json!({ "user": user })))
}

pub async fn forgot_password(
    State(service): State<AuthService>,
    Json(payload): Json<OTPRequest>,
) -> Result<Json<Value>, AppError> {
    use validator::Validate;
    payload.validate()
        .map_err(|e| AppError::ValidationError(e.to_string()))?;

    service.request_otp(payload.email).await?;

    Ok(Json(json!({ "message": "OTP for password reset sent successfully" })))
}

pub async fn reset_password_with_otp(
    State(service): State<AuthService>,
    Json(payload): Json<ResetPasswordWithOTPRequest>,
) -> Result<Json<Value>, AppError> {
    use validator::Validate;
    payload.validate()
        .map_err(|e| AppError::ValidationError(e.to_string()))?;

    service.reset_password_with_otp(&payload.email, &payload.otp, &payload.new_password).await?;

    Ok(Json(json!({ "message": "Password reset successfully" })))
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

    let user = service.update_user_network(user_id, payload.network).await?;

    Ok(Json(json!({ 
        "message": "Network switched successfully",
        "user": user 
    })))
}