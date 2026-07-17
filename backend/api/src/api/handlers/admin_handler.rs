use crate::dtos::admin_dtos::{
    AdminDeleteUserRequest, AdminLogEntry, AdminStatsResponse, AdminUsersResponse,
};
use crate::services::admin_service::AdminService;
use crate::utils::auth_jwt::Claims;
use crate::utils::error::AppError;
use axum::{Json, extract::State};
use serde::Deserialize;
use serde_json::{Value, json};
use validator::Validate;

#[derive(Debug, Deserialize)]
pub struct LogsQuery {
    pub limit: Option<i64>,
}

const DEFAULT_LOG_LIMIT: i64 = 20;
const MAX_LOG_LIMIT: i64 = 200;

pub async fn list_users(
    State(service): State<AdminService>,
    claims: Claims,
) -> Result<Json<AdminUsersResponse>, AppError> {
    let emails = service.list_user_emails(&claims).await?;
    Ok(Json(AdminUsersResponse { emails }))
}

pub async fn delete_user(
    State(service): State<AdminService>,
    claims: Claims,
    Json(payload): Json<AdminDeleteUserRequest>,
) -> Result<Json<Value>, AppError> {
    payload
        .validate()
        .map_err(|e| AppError::ValidationError(e.to_string()))?;

    let deleted_email = service.delete_user(&claims, &payload.email).await?;

    Ok(Json(json!({ "message": "User deleted", "email": deleted_email })))
}

pub async fn stats(
    State(service): State<AdminService>,
    claims: Claims,
) -> Result<Json<AdminStatsResponse>, AppError> {
    let stats = service.stats(&claims).await?;
    Ok(Json(stats))
}

pub async fn list_logs(
    State(service): State<AdminService>,
    claims: Claims,
    axum::extract::Query(query): axum::extract::Query<LogsQuery>,
) -> Result<Json<Vec<AdminLogEntry>>, AppError> {
    let limit = query.limit.unwrap_or(DEFAULT_LOG_LIMIT).clamp(1, MAX_LOG_LIMIT);
    let logs = service.list_logs(&claims, limit).await?;
    Ok(Json(logs))
}
