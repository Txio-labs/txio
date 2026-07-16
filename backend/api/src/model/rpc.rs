use serde::{Deserialize, Serialize};
use mongodb::bson::oid::ObjectId;
use chrono::{DateTime, Utc};
use serde_json::{Map, Value};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RpcLog {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: ObjectId,
    pub method: String,
    pub params: Value,
    pub timestamp: DateTime<Utc>,
    pub success: bool,
    pub error: Option<String>,
}

impl RpcLog {
    pub fn new(user_id: ObjectId, method: String, params: Value, success: bool, error: Option<String>) -> Self {
        Self {
            id: None,
            user_id,
            method,
            params: Self::sanitize_params(&params),
            timestamp: Utc::now(),
            success,
            error,
        }
    }

    fn sanitize_params(params: &Value) -> Value {
        match params {
            Value::Object(map) => {
                let mut sanitized = Map::new();
                for (key, value) in map {
                    if Self::is_sensitive_key(key) {
                        sanitized.insert(key.clone(), Value::String("[REDACTED]".to_string()));
                    } else {
                        sanitized.insert(key.clone(), Self::sanitize_params(value));
                    }
                }
                Value::Object(sanitized)
            }
            Value::Array(values) => Value::Array(values.iter().map(Self::sanitize_params).collect()),
            Value::String(s) => {
                if Self::looks_like_sensitive_data(s) {
                    Value::String("[REDACTED]".to_string())
                } else {
                    Value::String(s.clone())
                }
            }
            other => other.clone(),
        }
    }

    fn is_sensitive_key(key: &str) -> bool {
        let normalized = key.to_ascii_lowercase();
        normalized.contains("private")
            || normalized.contains("secret")
            || normalized.contains("token")
            || normalized.contains("key")
            || normalized.contains("password")
            || normalized.contains("signature")
            || normalized.contains("tx")
            || normalized.contains("transaction")
            || normalized.contains("seed")
    }

    fn looks_like_sensitive_data(value: &str) -> bool {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            return false;
        }

        let lower = trimmed.to_ascii_lowercase();
        lower.starts_with("0x") && trimmed.len() > 64
            || lower.contains("private")
            || lower.contains("secret")
            || lower.contains("password")
            || lower.contains("bearer")
            || lower.contains("authorization")
            || lower.contains("eyj")
            || lower.contains("-----begin")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn redacts_sensitive_rpc_params_before_storage() {
        let params = serde_json::json!({
            "method": "eth_sendRawTransaction",
            "params": [{
                "rawTransaction": "0xabc1234567890abcdef",
                "password": "supersecret"
            }],
            "network": "mainnet"
        });

        let log = RpcLog::new(ObjectId::new(), "eth_sendRawTransaction".to_string(), params, true, None);
        let params = log.params;

        assert_eq!(params["params"][0]["rawTransaction"], Value::String("[REDACTED]".to_string()));
        assert_eq!(params["params"][0]["password"], Value::String("[REDACTED]".to_string()));
        assert_eq!(params["network"], Value::String("mainnet".to_string()));
    }

    #[test]
    fn preserves_non_sensitive_values() {
        let params = serde_json::json!({
            "method": "eth_blockNumber",
            "params": []
        });

        let log = RpcLog::new(ObjectId::new(), "eth_blockNumber".to_string(), params, true, None);
        assert_eq!(log.params, serde_json::json!({
            "method": "eth_blockNumber",
            "params": []
        }));
    }
}
