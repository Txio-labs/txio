use crate::{
    dtos::ai::{AiChatRequest, AiChatResponse},
    services::ai_service::AiService,
    utils::error::AppError,
};
use axum::{Json, extract::State};
use validator::Validate;

pub async fn chat(
    State(service): State<AiService>,
    Json(payload): Json<AiChatRequest>,
) -> Result<Json<AiChatResponse>, AppError> {
    payload
        .validate()
        .map_err(|error| AppError::ValidationError(error.to_string()))?;

    let response = service.chat(&payload.messages).await?;

    Ok(Json(response))
}
