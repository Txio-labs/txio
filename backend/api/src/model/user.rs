use chrono::{DateTime, Utc};
use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

use crate::model::network::Network;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub email: String,
    pub password_hash: String,
    pub tier: PlanTier,
    #[serde(default)]
    pub network: Network,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum PlanTier {
    Free,
    Pro,
    Team,
}

impl User {
    pub fn new(email: String, password_hash: String) -> Self {
        Self {
            id: None,
            email,
            password_hash,
            tier: PlanTier::Free,
            network: Network::default(),
            created_at: Utc::now(),
        }
    }
}
