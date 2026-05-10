use serde::{Deserialize, Serialize};
use mongodb::bson::oid::ObjectId;
use chrono::{DateTime, Utc};
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RpcLog {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: ObjectId,
    pub method: String,
    pub params: Value,
    pub timestamp: DateTime<Utc>,
    pub success: bool,
    pub error: Option<String>,
}

impl RpcLog {
    pub fn new(user_id: ObjectId, method: String, params: Value, success: bool, error: Option<String>) -> Self {
        Self {
            id: None,
            user_id,
            method,
            params,
            timestamp: Utc::now(),
            success,
            error,
        }
    }
}
