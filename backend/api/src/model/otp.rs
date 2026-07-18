use serde::{Deserialize, Serialize};
use mongodb::bson::oid::ObjectId;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OTP {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub email: String,
    pub otp: String,
    #[serde(default)]
    pub failed_attempts: i32,
    pub created_at: DateTime<Utc>,
}

impl OTP {
    pub fn new(email: String, otp: String) -> Self {
        Self {
            id: None,
            email,
            otp,
            failed_attempts: 0,
            created_at: Utc::now(),
        }
    }
}