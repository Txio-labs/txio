use crate::dtos::request::TerminalCommandRequest;
use crate::services::terminal_service::{CommandExecutionResponse, TerminalService};
use crate::utils::error::AppError;
use axum::{
    Json,
    extract::{Path, State},
};
use validator::Validate;

pub async fn execute(
    State(service): State<TerminalService>,
    Json(payload): Json<TerminalCommandRequest>,
) -> Result<Json<CommandExecutionResponse>, AppError> {
    payload
        .validate()
        .map_err(|error| AppError::ValidationError(error.to_string()))?;

    let result = service
        .execute(payload.command.trim())
        .await
        .map_err(AppError::BadRequest)?;

    Ok(Json(result))
}

pub async fn get_execution(
    State(service): State<TerminalService>,
    Path(execution_id): Path<String>,
) -> Result<Json<CommandExecutionResponse>, AppError> {
    let result = service
        .get_execution(&execution_id)
        .await
        .ok_or_else(|| AppError::NotFound("Execution not found.".to_string()))?;

    Ok(Json(result))
}

pub async fn cancel_execution(
    State(service): State<TerminalService>,
    Path(execution_id): Path<String>,
) -> Result<Json<CommandExecutionResponse>, AppError> {
    let result = service
        .cancel_execution(&execution_id)
        .await
        .map_err(|error| match error.as_str() {
            "Execution not found." => AppError::NotFound(error),
            _ => AppError::BadRequest(error),
        })?;

    Ok(Json(result))
}
