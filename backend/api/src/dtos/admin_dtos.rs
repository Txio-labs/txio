use serde::{Deserialize, Serialize};
use serde_json::Value;
use validator::Validate;

#[derive(Debug, Serialize, Deserialize)]
pub struct AdminUsersResponse {
    pub emails: Vec<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct AdminDeleteUserRequest {
    #[validate(email)]
    pub email: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AdminStatsResponse {
    pub user_count: u64,
    pub rpc_log_count: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AdminLogEntry {
    pub method: String,
    pub success: bool,
    pub error: Option<String>,
    pub timestamp: String,
}

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct RpcLogRequest {
    #[validate(length(min = 1))]
    pub method: String,
    pub params: Value,
    pub success: bool,
    pub error: Option<String>,
}
