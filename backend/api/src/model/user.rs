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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub google_sub: Option<String>,
    pub tier: PlanTier,
    #[serde(default)]
    pub network: Network,
    pub created_at: DateTime<Utc>,
    #[serde(default)]
    pub notification_preferences: NotificationPreferences,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NotificationPreferences {
    pub email_digests: bool,
    pub email_security_alerts: bool,
    pub in_app_activity_alerts: bool,
    pub in_app_product_updates: bool,
}

impl Default for NotificationPreferences {
    fn default() -> Self {
        Self {
            email_digests: true,
            email_security_alerts: true,
            in_app_activity_alerts: true,
            in_app_product_updates: false,
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
            google_sub: None,
            tier: PlanTier::Free,
            network: Network::default(),
            created_at: Utc::now(),
            notification_preferences: NotificationPreferences::default(),
        }
    }

    pub fn new_oauth(email: String, password_hash: String, google_sub: String) -> Self {
        Self {
            google_sub: Some(google_sub),
            ..Self::new(email, password_hash)
        }
    }
}
