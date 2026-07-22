use chrono::{DateTime, Utc};
use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};
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
    pub fn new(
        user_id: ObjectId,
        method: String,
        params: Value,
        success: bool,
        error: Option<String>,
    ) -> Self {
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
            Value::Array(values) => {
                Value::Array(values.iter().map(Self::sanitize_params).collect())
            }
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
            || Self::looks_like_base64_blob(trimmed)
    }

    /// Real Sui/EVM write calls (`sui_executeTransactionBlock`,
    /// `sui_signAndExecuteTransactionBlock`, `eth_sendRawTransaction`, ...) pass signed
    /// transaction bytes and signatures as positional, unnamed base64 strings, which the
    /// key-based and hex-based checks above never see. Any sufficiently long string that is
    /// entirely base64 alphabet is treated as sensitive rather than trying to enumerate every
    /// write method by name.
    fn looks_like_base64_blob(value: &str) -> bool {
        const MIN_LEN: usize = 40;
        if value.len() < MIN_LEN {
            return false;
        }

        let core_end = value
            .rfind(|c: char| c != '=')
            .map(|idx| idx + 1)
            .unwrap_or(0);
        let (core, padding) = value.split_at(core_end);

        !core.is_empty()
            && padding.len() <= 2
            && core
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || c == '+' || c == '/')
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

        let log = RpcLog::new(
            ObjectId::new(),
            "eth_sendRawTransaction".to_string(),
            params,
            true,
            None,
        );
        let params = log.params;

        assert_eq!(
            params["params"][0]["rawTransaction"],
            Value::String("[REDACTED]".to_string())
        );
        assert_eq!(
            params["params"][0]["password"],
            Value::String("[REDACTED]".to_string())
        );
        assert_eq!(params["network"], Value::String("mainnet".to_string()));
    }

    #[test]
    fn redacts_base64_signed_tx_bytes_in_positional_array_params() {
        // Real sui_executeTransactionBlock-shaped call: signed tx bytes and signature
        // passed as positional (unnamed) base64 strings, not under any sensitive key.
        let params = serde_json::json!([
            "AAACACBTdWkgVHJhbnNhY3Rpb25CbG9ja0RhdGFCYXNlNjRFbmNvZGVkQnl0ZXM=",
            ["AMOCK1SIGNATURE1BASE64ENCODEDBYTESTHATARELONGENOUGHTOMATCH=="],
            { "showEffects": true }
        ]);

        let log = RpcLog::new(
            ObjectId::new(),
            "sui_executeTransactionBlock".to_string(),
            params,
            true,
            None,
        );
        let params = log.params;

        assert_eq!(params[0], Value::String("[REDACTED]".to_string()));
        assert_eq!(params[1][0], Value::String("[REDACTED]".to_string()));
        assert_eq!(params[2]["showEffects"], Value::Bool(true));
    }

    #[test]
    fn preserves_non_sensitive_values() {
        let params = serde_json::json!({
            "method": "eth_blockNumber",
            "params": []
        });

        let log = RpcLog::new(
            ObjectId::new(),
            "eth_blockNumber".to_string(),
            params,
            true,
            None,
        );
        assert_eq!(
            log.params,
            serde_json::json!({
                "method": "eth_blockNumber",
                "params": []
            })
        );
    }
}
