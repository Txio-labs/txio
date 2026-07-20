use crate::model::user::NotificationPreferences;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct UserResponse {
    pub id: String,
    pub name: String,
    pub email: String,
    pub created_at: String,
    pub notification_preferences: NotificationPreferences,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: UserResponse,
}

/// A single active session entry returned to the client.
#[derive(Debug, Serialize, Deserialize)]
pub struct SessionResponse {
    /// MongoDB ObjectId string — used as the revocation target.
    pub id: String,
    /// Human-readable device label, e.g. "Chrome on macOS".
    pub device_label: String,
    /// IP address recorded at sign-in time.
    pub ip_address: String,
    /// ISO-8601 creation timestamp.
    pub created_at: String,
    /// ISO-8601 last-active timestamp.
    pub last_active_at: String,
    /// True when this session matches the JWT that issued the current request.
    pub is_current: bool,
}
