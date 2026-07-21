use chrono::{DateTime, Utc};
use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum WorkspaceType {
    Personal,
    Team,
}

impl Default for WorkspaceType {
    fn default() -> Self {
        Self::Personal
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Workspace {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: ObjectId,
    pub name: String,
    #[serde(rename = "type", default)]
    pub workspace_type: WorkspaceType,
    #[serde(default)]
    pub active_env_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Workspace {
    pub fn new(user_id: ObjectId, name: String, workspace_type: WorkspaceType) -> Self {
        Self {
            id: None,
            user_id,
            name,
            workspace_type,
            active_env_id: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }
}
