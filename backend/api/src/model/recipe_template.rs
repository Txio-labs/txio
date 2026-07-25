use chrono::{DateTime, Utc};
use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};
use validator::Validate;

/// A user-defined transaction recipe template, shown on the Recipes page and
/// loaded into a builder tab (PTB, MoveCall, Publish) when the user hits "Load".
#[derive(Debug, Serialize, Deserialize, Validate, Clone)]
pub struct RecipeTemplate {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,

    pub user_id: ObjectId,

    #[validate(length(min = 1, message = "Title cannot be empty"))]
    pub title: String,

    #[validate(length(min = 1, message = "Type cannot be empty"))]
    pub recipe_type: String,

    pub description: Option<String>,

    // Arbitrary starter payload (e.g. pre-filled PTB commands or MoveCall
    // args) applied to the builder tab when the template is loaded.
    #[serde(default)]
    pub payload: serde_json::Value,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl RecipeTemplate {
    pub fn new(
        user_id: ObjectId,
        title: String,
        recipe_type: String,
        description: Option<String>,
        payload: serde_json::Value,
    ) -> Self {
        Self {
            id: None,
            user_id,
            title,
            recipe_type,
            description,
            payload,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }
}
