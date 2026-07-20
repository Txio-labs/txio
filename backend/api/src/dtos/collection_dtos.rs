use serde::Deserialize;
use serde_json::Value;
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct CreateCollectionRequest {
    #[validate(length(min = 1, message = "Workspace ID is required"))]
    pub workspace_id: String,

    #[validate(length(min = 1, message = "Name cannot be empty"))]
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CollectionQuery {
    pub workspace_id: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateCollectionRequest {
    #[validate(length(min = 1, message = "Name cannot be empty"))]
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateSavedRequestRequest {
    #[validate(length(min = 1, message = "Name cannot be empty"))]
    pub name: String,

    #[validate(length(min = 1, message = "Method cannot be empty"))]
    pub method: String,

    pub params: Value,

    // Optional overrides
    pub network: Option<String>,
    pub rpc_url: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateSavedRequestRequest {
    pub name: Option<String>,
    pub method: Option<String>,
    pub params: Option<Value>,

    #[serde(default, with = "serde_with::rust::double_option")]
    pub network: Option<Option<String>>,

    #[serde(default, with = "serde_with::rust::double_option")]
    pub rpc_url: Option<Option<String>>,

    #[serde(default, with = "serde_with::rust::double_option")]
    pub last_response: Option<Option<Value>>,
}

// Responses could just use the Models directly since they are Serialize,
// or wrap them. For simplicity, we'll return models directly in handlers.

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_update_saved_request_omitted_fields() {
        let json_data = json!({
            "name": "Updated Name"
        });
        let req: UpdateSavedRequestRequest = serde_json::from_value(json_data).unwrap();
        assert_eq!(req.name, Some("Updated Name".to_string()));
        assert_eq!(req.network, None);
        assert_eq!(req.rpc_url, None);
        assert_eq!(req.last_response, None);
    }

    #[test]
    fn test_update_saved_request_explicit_null_fields() {
        let json_data = json!({
            "network": null,
            "rpc_url": null,
            "last_response": null
        });
        let req: UpdateSavedRequestRequest = serde_json::from_value(json_data).unwrap();
        assert_eq!(req.network, Some(None));
        assert_eq!(req.rpc_url, Some(None));
        assert_eq!(req.last_response, Some(None));
    }

    #[test]
    fn test_update_saved_request_explicit_value_fields() {
        let json_data = json!({
            "network": "testnet",
            "rpc_url": "https://fullnode.testnet.sui.io",
            "last_response": { "status": "ok" }
        });
        let req: UpdateSavedRequestRequest = serde_json::from_value(json_data).unwrap();
        assert_eq!(req.network, Some(Some("testnet".to_string())));
        assert_eq!(
            req.rpc_url,
            Some(Some("https://fullnode.testnet.sui.io".to_string()))
        );
        assert_eq!(req.last_response, Some(Some(json!({ "status": "ok" }))));
    }
}
