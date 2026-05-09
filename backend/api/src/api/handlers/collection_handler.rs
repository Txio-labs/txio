use axum::{extract::{State, Path}, Json};
use crate::services::collection_service::CollectionService;
use crate::dtos::collection_dtos::{CreateCollectionRequest, UpdateCollectionRequest, CreateSavedRequestRequest, UpdateSavedRequestRequest};
use crate::utils::error::AppError;
use crate::utils::auth_jwt::Claims;
use serde_json::{json, Value};
use mongodb::bson::oid::ObjectId;
use std::str::FromStr;
use validator::Validate; // Import trait

// --- Collections ---

pub async fn create_collection(
    State(service): State<CollectionService>,
    claims: Claims,
    Json(payload): Json<CreateCollectionRequest>,
) -> Result<Json<Value>, AppError> {
    payload.validate().map_err(|e| AppError::ValidationError(e.to_string()))?;

    let user_id = ObjectId::from_str(&claims.sub).map_err(|_| AppError::Unauthorized("Invalid user ID in token".into()))?;
    
    let collection = service.create_collection(user_id, payload.name, payload.description).await?;
    
    Ok(Json(serde_json::to_value(collection).unwrap()))
}

pub async fn get_user_collections(
    State(service): State<CollectionService>,
    claims: Claims,
) -> Result<Json<Value>, AppError> {
    let user_id = ObjectId::from_str(&claims.sub).map_err(|_| AppError::Unauthorized("Invalid user ID in token".into()))?;
    
    let collections = service.get_user_collections(user_id).await?;
    
    Ok(Json(serde_json::to_value(collections).unwrap()))
}

pub async fn get_collection(
    State(service): State<CollectionService>,
    claims: Claims,
    Path(id): Path<String>,
) -> Result<Json<Value>, AppError> {
    let user_id = ObjectId::from_str(&claims.sub).map_err(|_| AppError::Unauthorized("Invalid user ID in token".into()))?;
    let collection_id = ObjectId::from_str(&id).map_err(|_| AppError::BadRequest("Invalid collection ID".into()))?;
    
    let collection = service.get_collection(collection_id, user_id).await?;
    
    Ok(Json(serde_json::to_value(collection).unwrap()))
}

pub async fn update_collection(
    State(service): State<CollectionService>,
    claims: Claims,
    Path(id): Path<String>,
    Json(payload): Json<UpdateCollectionRequest>,
) -> Result<Json<Value>, AppError> {
    payload.validate().map_err(|e| AppError::ValidationError(e.to_string()))?;
    
    let user_id = ObjectId::from_str(&claims.sub).map_err(|_| AppError::Unauthorized("Invalid user ID in token".into()))?;
    let collection_id = ObjectId::from_str(&id).map_err(|_| AppError::BadRequest("Invalid collection ID".into()))?;
    
    let collection = service.update_collection(collection_id, user_id, payload.name, payload.description).await?;
    
    Ok(Json(serde_json::to_value(collection).unwrap()))
}

pub async fn delete_collection(
    State(service): State<CollectionService>,
    claims: Claims,
    Path(id): Path<String>,
) -> Result<Json<Value>, AppError> {
    let user_id = ObjectId::from_str(&claims.sub).map_err(|_| AppError::Unauthorized("Invalid user ID in token".into()))?;
    let collection_id = ObjectId::from_str(&id).map_err(|_| AppError::BadRequest("Invalid collection ID".into()))?;
    
    service.delete_collection(collection_id, user_id).await?;
    
    Ok(Json(json!({ "message": "Collection deleted successfully" })))
}

// --- Requests ---

pub async fn add_request(
    State(service): State<CollectionService>,
    claims: Claims,
    Path(id): Path<String>, // Collection ID
    Json(payload): Json<CreateSavedRequestRequest>,
) -> Result<Json<Value>, AppError> {
    payload.validate().map_err(|e| AppError::ValidationError(e.to_string()))?;
    
    let user_id = ObjectId::from_str(&claims.sub).map_err(|_| AppError::Unauthorized("Invalid user ID in token".into()))?;
    let collection_id = ObjectId::from_str(&id).map_err(|_| AppError::BadRequest("Invalid collection ID".into()))?;
    
    let request = service.add_request(
        user_id,
        collection_id, 
        payload.name, 
        payload.method, 
        payload.params,
        payload.network,
        payload.rpc_url
    ).await?;
    
    Ok(Json(serde_json::to_value(request).unwrap()))
}

pub async fn get_collection_requests(
    State(service): State<CollectionService>,
    claims: Claims,
    Path(id): Path<String>, // Collection ID
) -> Result<Json<Value>, AppError> {
    let user_id = ObjectId::from_str(&claims.sub).map_err(|_| AppError::Unauthorized("Invalid user ID in token".into()))?;
    let collection_id = ObjectId::from_str(&id).map_err(|_| AppError::BadRequest("Invalid collection ID".into()))?;
    
    let requests = service.get_collection_requests(collection_id, user_id).await?;
    
    Ok(Json(serde_json::to_value(requests).unwrap()))
}

pub async fn update_request(
    State(service): State<CollectionService>,
    claims: Claims,
    Path((_col_id, req_id)): Path<(String, String)>, // Collection ID (ignored/redundant), Request ID
    Json(payload): Json<UpdateSavedRequestRequest>,
) -> Result<Json<Value>, AppError> {
    let user_id = ObjectId::from_str(&claims.sub).map_err(|_| AppError::Unauthorized("Invalid user ID in token".into()))?;
    let request_id = ObjectId::from_str(&req_id).map_err(|_| AppError::BadRequest("Invalid request ID".into()))?;
    
    let request = service.update_request(
        request_id,
        user_id,
        payload.name,
        payload.method,
        payload.params,
        payload.network,
        payload.rpc_url,
        payload.last_response
    ).await?;
    
    Ok(Json(serde_json::to_value(request).unwrap()))
}

pub async fn delete_request(
    State(service): State<CollectionService>,
    claims: Claims,
    Path((_col_id, req_id)): Path<(String, String)>,
) -> Result<Json<Value>, AppError> {
    let user_id = ObjectId::from_str(&claims.sub).map_err(|_| AppError::Unauthorized("Invalid user ID in token".into()))?;
    let request_id = ObjectId::from_str(&req_id).map_err(|_| AppError::BadRequest("Invalid request ID".into()))?;
    
    service.delete_request(request_id, user_id).await?;
    
    Ok(Json(json!({ "message": "Request deleted successfully" })))
}

pub async fn execute_request(
    State(service): State<CollectionService>,
    claims: Claims,
    Path((_col_id, req_id)): Path<(String, String)>,
) -> Result<Json<Value>, AppError> {
    let user_id = ObjectId::from_str(&claims.sub).map_err(|_| AppError::Unauthorized("Invalid user ID in token".into()))?;
    let request_id = ObjectId::from_str(&req_id).map_err(|_| AppError::BadRequest("Invalid request ID".into()))?;
    
    let (req, result) = service.execute_request(request_id, user_id).await?;
    
    Ok(Json(json!({
        "request": req,
        "result": result
    })))
}
