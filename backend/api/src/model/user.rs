use serde::{Deserialize, Serialize};
use mongodb::bson::oid::ObjectId;
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub email: String,
    pub password_hash: String,
    pub tier: PlanTier,
    #[serde(default)]
    pub network: SuiNetwork,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default, clap::ValueEnum)]
pub enum SuiNetwork {
    #[default]
    Mainnet,
    Testnet,
    Devnet,
}

impl SuiNetwork {
    pub fn url(&self) -> &'static str {
        match self {
            SuiNetwork::Mainnet => "https://fullnode.mainnet.sui.io:443",
            SuiNetwork::Testnet => "https://fullnode.testnet.sui.io:443",
            SuiNetwork::Devnet => "https://fullnode.devnet.sui.io:443",
        }
    }
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
            network: SuiNetwork::Mainnet,
            created_at: Utc::now(),
        }
    }
}
