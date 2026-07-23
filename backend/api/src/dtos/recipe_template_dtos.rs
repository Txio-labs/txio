use serde::{Deserialize, Serialize};
use validator::Validate;

const VALID_TEMPLATE_TYPES: [&str; 3] = ["PTB", "MoveCall", "Publish"];

#[derive(Debug, Deserialize, Validate)]
pub struct CreateRecipeTemplateRequest {
    #[validate(length(min = 1, max = 100, message = "Title must be 1-100 characters"))]
    pub title: String,

    #[validate(custom(function = "validate_template_type"))]
    pub template_type: String,
}

fn validate_template_type(value: &str) -> Result<(), validator::ValidationError> {
    if VALID_TEMPLATE_TYPES.contains(&value) {
        Ok(())
    } else {
        Err(validator::ValidationError::new("invalid_template_type"))
    }
}

#[derive(Debug, Serialize)]
pub struct RecipeTemplateResponse {
    pub id: String,
    pub title: String,
    pub template_type: String,
    pub created_at: String,
}
