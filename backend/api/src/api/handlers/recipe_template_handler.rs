use crate::dtos::recipe_template_dtos::CreateRecipeTemplateRequest;
use crate::services::recipe_template_service::RecipeTemplateService;
use crate::utils::auth_jwt::Claims;
use crate::utils::error::AppError;
use axum::{
    Json,
    extract::{Path, State},
};
use mongodb::bson::oid::ObjectId;
use serde_json::{Value, json};
use std::str::FromStr;
use validator::Validate;

pub async fn create_template(
    State(service): State<RecipeTemplateService>,
    claims: Claims,
    Json(payload): Json<CreateRecipeTemplateRequest>,
) -> Result<Json<Value>, AppError> {
    payload
        .validate()
        .map_err(|e| AppError::ValidationError(e.to_string()))?;

    let user_id = ObjectId::from_str(&claims.sub)
        .map_err(|_| AppError::Unauthorized("Invalid user ID in token".into()))?;

    let template = service
        .create_template(user_id, payload.title, payload.template_type)
        .await?;

    Ok(Json(serde_json::to_value(template).unwrap()))
}

pub async fn list_templates(
    State(service): State<RecipeTemplateService>,
    claims: Claims,
) -> Result<Json<Value>, AppError> {
    let user_id = ObjectId::from_str(&claims.sub)
        .map_err(|_| AppError::Unauthorized("Invalid user ID in token".into()))?;

    let templates = service.list_templates(user_id).await?;

    Ok(Json(json!({ "templates": templates })))
}

pub async fn delete_template(
    State(service): State<RecipeTemplateService>,
    claims: Claims,
    Path(id): Path<String>,
) -> Result<Json<Value>, AppError> {
    let user_id = ObjectId::from_str(&claims.sub)
        .map_err(|_| AppError::Unauthorized("Invalid user ID in token".into()))?;
    let template_id =
        ObjectId::from_str(&id).map_err(|_| AppError::BadRequest("Invalid template ID".into()))?;

    service.delete_template(template_id, user_id).await?;

    Ok(Json(json!({ "message": "Template deleted" })))
}
