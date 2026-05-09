use serde::Deserialize;
use validator::Validate;
use serde_json::Value;

#[derive(Debug, Deserialize, Validate)]
pub struct CreateCollectionRequest {
    #[validate(length(min = 1, message = "Name cannot be empty"))]
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateCollectionRequest {
    #[validate(length(min = 1, message = "Name cannot be empty"))]
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateSavedRequestRequest {
    #[validate(length(min = 1, message = "Name cannot be empty"))]
    pub name: String,
    
    #[validate(length(min = 1, message = "Method cannot be empty"))]
    pub method: String,
    
    pub params: Value,
    
    // Optional overrides
    pub network: Option<String>,
    pub rpc_url: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateSavedRequestRequest {
    pub name: Option<String>,
    pub method: Option<String>,
    pub params: Option<Value>,
    pub network: Option<String>,
    pub rpc_url: Option<String>,
    pub last_response: Option<Value>,
}

// Responses could just use the Models directly since they are Serialize, 
// or wrap them. For simplicity, we'll return models directly in handlers.
