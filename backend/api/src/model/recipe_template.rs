use chrono::{DateTime, Utc};
use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

/// A user-saved transaction recipe template, shown on the Recipes page.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecipeTemplate {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,

    pub user_id: ObjectId,

    pub title: String,

    /// One of "PTB", "MoveCall", "Publish" — determines which builder tab
    /// "Load" opens.
    pub template_type: String,

    pub created_at: DateTime<Utc>,
}

impl RecipeTemplate {
    pub fn new(user_id: ObjectId, title: String, template_type: String) -> Self {
        Self {
            id: None,
            user_id,
            title,
            template_type,
            created_at: Utc::now(),
        }
    }
}
