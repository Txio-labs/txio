use serde::{Deserialize, Serialize};
use serde_json::Value;
use validator::Validate;

#[derive(Debug, Serialize, Deserialize)]
pub struct AdminUsersResponse {
    pub emails: Vec<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct AdminDeleteUserRequest {
    #[validate(email)]
    pub email: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AdminStatsResponse {
    pub user_count: u64,
    pub rpc_log_count: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AdminLogEntry {
    pub method: String,
    pub success: bool,
    pub error: Option<String>,
    pub timestamp: String,
}

/// Upper bound on the serialized size of client-reported RPC params, in bytes.
/// Real params (signed tx bytes, PTBs, call arguments) are at most a few KB;
/// anything past this is either a mistake or an attempt to bloat the audit log.
pub const MAX_RPC_LOG_PARAMS_BYTES: usize = 64 * 1024;

/// Upper bound on a client-reported error message's length, in bytes.
pub const MAX_RPC_LOG_ERROR_BYTES: u64 = 2048;

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct RpcLogRequest {
    #[validate(
        length(min = 1, max = 64),
        custom(function = "validate_rpc_method_name")
    )]
    pub method: String,
    pub params: Value,
    pub success: bool,
    #[validate(length(max = "MAX_RPC_LOG_ERROR_BYTES"))]
    pub error: Option<String>,
}

/// `/auth/rpc-log` lets any authenticated user submit a self-reported audit
/// entry (the CLI's `chain call` command uses it to log the real RPC calls it
/// just made), so the backend can't verify a given entry corresponds to an
/// actual call. This can't fully close that gap without re-executing every
/// call server-side, but it does reject the easy abuse: method names that
/// don't even look like a JSON-RPC method (`namespace_methodName`, matching
/// every real method used across the supported chains — `eth_call`,
/// `sui_getObject`, `suix_getAllBalances`, `personal_sign`, ...).
fn validate_rpc_method_name(method: &str) -> Result<(), validator::ValidationError> {
    let is_valid = method.split_once('_').is_some_and(|(namespace, name)| {
        !name.is_empty()
            && namespace
                .chars()
                .next()
                .is_some_and(|c| c.is_ascii_lowercase())
            && namespace
                .chars()
                .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit())
            && name.chars().all(|c| c.is_ascii_alphanumeric() || c == '_')
    });

    if is_valid {
        Ok(())
    } else {
        Err(validator::ValidationError::new("invalid_rpc_method_name"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_real_rpc_method_names_across_supported_chains() {
        for method in [
            "eth_call",
            "eth_blockNumber",
            "eth_getTransactionReceipt",
            "sui_getObject",
            "suix_getAllBalances",
            "suix_resolveNameServiceAddress",
            "personal_sign",
            "net_version",
            "debug_traceTransaction",
        ] {
            assert!(
                validate_rpc_method_name(method).is_ok(),
                "expected {method} to be accepted"
            );
        }
    }

    #[test]
    fn rejects_method_names_that_are_not_namespace_shaped() {
        for method in [
            "",
            "noNamespace",
            "_leadingUnderscore",
            "trailingUnderscore_",
            "has spaces_here",
            "sui_<script>alert(1)</script>",
            "1nvalid_namespace",
        ] {
            assert!(
                validate_rpc_method_name(method).is_err(),
                "expected {method:?} to be rejected"
            );
        }
    }

    #[test]
    fn rejects_overly_long_method_names() {
        let long_method = format!("eth_{}", "a".repeat(100));
        let request = RpcLogRequest {
            method: long_method,
            params: Value::Null,
            success: true,
            error: None,
        };
        assert!(request.validate().is_err());
    }

    #[test]
    fn rejects_overly_long_error_messages() {
        let request = RpcLogRequest {
            method: "eth_call".to_string(),
            params: Value::Null,
            success: false,
            error: Some("x".repeat(MAX_RPC_LOG_ERROR_BYTES as usize + 1)),
        };
        assert!(request.validate().is_err());
    }

    #[test]
    fn accepts_well_formed_request() {
        let request = RpcLogRequest {
            method: "sui_executeTransactionBlock".to_string(),
            params: serde_json::json!(["deadbeef"]),
            success: true,
            error: None,
        };
        assert!(request.validate().is_ok());
    }
}
