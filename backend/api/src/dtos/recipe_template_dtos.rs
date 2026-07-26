use serde::Deserialize;
use serde_json::Value;
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct CreateRecipeTemplateRequest {
    #[validate(length(min = 1, message = "Title cannot be empty"))]
    pub title: String,

    #[validate(length(min = 1, message = "Type cannot be empty"))]
    pub recipe_type: String,

    pub description: Option<String>,

    #[serde(default)]
    pub payload: Value,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn accepts_a_well_formed_request() {
        let json_data = json!({
            "title": "Batch Transfer",
            "recipe_type": "PTB",
            "description": "Split and send to many recipients"
        });
        let req: CreateRecipeTemplateRequest = serde_json::from_value(json_data).unwrap();
        assert!(req.validate().is_ok());
        assert_eq!(req.payload, Value::Null);
    }

    #[test]
    fn defaults_payload_when_omitted() {
        let json_data = json!({ "title": "Move Call", "recipe_type": "MoveCall" });
        let req: CreateRecipeTemplateRequest = serde_json::from_value(json_data).unwrap();
        assert_eq!(req.payload, Value::Null);
        assert_eq!(req.description, None);
    }

    #[test]
    fn rejects_an_empty_title() {
        let json_data = json!({ "title": "", "recipe_type": "PTB" });
        let req: CreateRecipeTemplateRequest = serde_json::from_value(json_data).unwrap();
        assert!(req.validate().is_err());
    }

    #[test]
    fn rejects_an_empty_recipe_type() {
        let json_data = json!({ "title": "Untitled", "recipe_type": "" });
        let req: CreateRecipeTemplateRequest = serde_json::from_value(json_data).unwrap();
        assert!(req.validate().is_err());
    }

    #[test]
    fn rejects_a_missing_recipe_type() {
        let json_data = json!({ "title": "Untitled" });
        let result: Result<CreateRecipeTemplateRequest, _> = serde_json::from_value(json_data);
        assert!(result.is_err());
    }
}
