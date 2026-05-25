use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct UserResponse {
    pub id: String,
    pub name: String,
    pub email: String,
    pub created_at: String,
}
#[derive(Debug, Serialize, Deserialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: UserResponse,
}
