use chrono::{DateTime, Utc};
use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

/// A login session recorded when a user authenticates successfully.
/// Each document corresponds to one JWT issued to a specific device.
/// Deleting a document signals that the session was revoked — note that
/// the JWT itself remains valid until its `exp` (JWT revocation is tracked
/// separately under issue #22); this record controls what appears in the
/// "Active sessions" UI and can be used for future blocklist checks.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Session {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,

    /// The user who owns this session.
    pub user_id: ObjectId,

    /// JWT ID (jti claim) that uniquely identifies the issued token.
    /// Used to determine which session entry is "current" without
    /// requiring a second DB lookup on every request.
    pub jti: String,

    /// Human-readable device label derived from the User-Agent header,
    /// e.g. "Chrome on macOS".
    pub device_label: String,

    /// IP address of the client at sign-in time; used for display only.
    pub ip_address: String,

    /// When the session (and the matching JWT) was created.
    pub created_at: DateTime<Utc>,

    /// Timestamp updated each time the session owner makes an authenticated
    /// request (optional future enhancement — populated at creation for now).
    pub last_active_at: DateTime<Utc>,
}

impl Session {
    pub fn new(user_id: ObjectId, jti: String, device_label: String, ip_address: String) -> Self {
        let now = Utc::now();
        Self {
            id: None,
            user_id,
            jti,
            device_label,
            ip_address,
            created_at: now,
            last_active_at: now,
        }
    }
}
