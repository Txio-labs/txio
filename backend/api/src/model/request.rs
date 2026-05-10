use serde::{Deserialize, Serialize};
use mongodb::bson::oid::ObjectId;
use chrono::{DateTime, Utc};
use validator::Validate;

#[derive(Debug, Serialize, Deserialize, Validate, Clone)]
pub struct SavedRequest {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,

    pub collection_id: ObjectId,
    pub user_id: ObjectId,

    #[validate(length(min = 1, message = "Name cannot be empty"))]
    pub name: String,

    #[validate(length(min = 1, message = "Method cannot be empty"))]
    pub method: String,

    pub params: serde_json::Value,
    
    pub network: Option<String>,
    pub rpc_url: Option<String>,

    pub last_response: Option<serde_json::Value>,
    pub last_executed_at: Option<DateTime<Utc>>,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl SavedRequest {
    pub fn new(
        collection_id: ObjectId,
        user_id: ObjectId,
        name: String,
        method: String,
        params: serde_json::Value,
        network: Option<String>,
        rpc_url: Option<String>,
    ) -> Self {
        Self {
            id: None,
            collection_id,
            user_id,
            name,
            method,
            params,
            network,
            rpc_url,
            last_response: None,
            last_executed_at: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }
}
