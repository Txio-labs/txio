use crate::dtos::workspace_dtos::CreateWorkspaceRequest;
use crate::services::workspace_service::WorkspaceService;
use crate::utils::auth_jwt::Claims;
use crate::utils::error::AppError;
use axum::{Json, extract::State};
use mongodb::bson::oid::ObjectId;
use serde_json::Value;
use std::str::FromStr;
use validator::Validate;

pub async fn create_workspace(
    State(service): State<WorkspaceService>,
    claims: Claims,
    Json(payload): Json<CreateWorkspaceRequest>,
) -> Result<Json<Value>, AppError> {
    payload
        .validate()
        .map_err(|e| AppError::ValidationError(e.to_string()))?;

    let user_id = ObjectId::from_str(&claims.sub)
        .map_err(|_| AppError::Unauthorized("Invalid user ID in token".into()))?;

    let workspace = service
        .create_workspace(
            user_id,
            payload.name,
            payload.workspace_type.unwrap_or_default(),
        )
        .await?;

    Ok(Json(serde_json::to_value(workspace).unwrap()))
}

pub async fn get_user_workspaces(
    State(service): State<WorkspaceService>,
    claims: Claims,
) -> Result<Json<Value>, AppError> {
    let user_id = ObjectId::from_str(&claims.sub)
        .map_err(|_| AppError::Unauthorized("Invalid user ID in token".into()))?;

    let workspaces = service.get_user_workspaces(user_id).await?;

    Ok(Json(serde_json::to_value(workspaces).unwrap()))
}
