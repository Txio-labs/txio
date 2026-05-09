use crate::repositories::rpc_repository::RpcRepository;
use crate::model::rpc::RpcLog;
use crate::model::user::User;
use serde_json::Value;
use reqwest::Client;
use crate::utils::error::AppError;
use mongodb::bson::oid::ObjectId;

#[derive(Clone)]
pub struct SuiService {
    rpc_repo: RpcRepository,
    client: Client,
    rpc_url: String,
}

#[derive(serde::Serialize)]
struct JsonRpcRequest<'a> {
    jsonrpc: &'a str,
    id: u64,
    method: &'a str,
    params: &'a Value,
}

#[derive(serde::Deserialize, Debug)]
#[allow(dead_code)]
struct JsonRpcResponse {
    jsonrpc: String,
    id: u64,
    result: Option<Value>,
    error: Option<Value>,
}

impl SuiService {
    pub fn new(rpc_repo: RpcRepository, rpc_url: String) -> Self {
        Self {
            rpc_repo,
            client: Client::new(),
            rpc_url,
        }
    }

    pub async fn call_rpc(&self, user: &User, method: &str, params: &Value) -> Result<Value, AppError> {
        self.call_rpc_direct(user.network.url(), user.id.clone().unwrap_or_else(ObjectId::new), method, params).await
    }

    pub async fn call_rpc_direct(&self, url: &str, user_id: ObjectId, method: &str, params: &Value) -> Result<Value, AppError> {
        let request_body = JsonRpcRequest {
            jsonrpc: "2.0",
            id: 1,
            method,
            params,
        };

        let response_result = self.client.post(url)
            .json(&request_body)
            .send()
            .await;

        let (success, full_resp_val, error_msg) = match response_result {
            Ok(resp) => {
                if resp.status().is_success() {
                    match resp.json::<Value>().await {
                        Ok(val) => {
                            // Check for "error" field in the JSON-RPC response
                            let has_error = val.get("error").is_some();
                            let rpc_error_msg = if has_error { Some(format!("RPC Error: {}", val["error"])) } else { None };
                            (
                                !has_error, 
                                val, 
                                rpc_error_msg
                            )
                        },
                        Err(e) => {
                            let msg = format!("Failed to parse JSON response: {}", e);
                            (false, serde_json::json!({
                                "jsonrpc": "2.0",
                                "id": 1,
                                "error": { "code": -32700, "message": msg }
                            }), Some(msg))
                        },
                    }
                } else {
                    let msg = format!("HTTP Error: {}", resp.status());
                    (false, serde_json::json!({
                        "jsonrpc": "2.0",
                        "id": 1,
                        "error": { "code": -32000, "message": msg }
                    }), Some(msg))
                }
            },
            Err(e) => {
                let msg = format!("Network Error: {}", e);
                (false, serde_json::json!({
                    "jsonrpc": "2.0",
                    "id": 1,
                    "error": { "code": -32001, "message": msg }
                }), Some(msg))
            },
        };

        // Log the request
        let log = RpcLog::new(
            user_id,
            method.to_string(),
            params.clone(),
            success,
            error_msg.clone(),
        );

        if let Err(e) = self.rpc_repo.save(&log).await {
            eprintln!("Failed to save RPC log: {}", e);
        }

        // Return the full JSON object (either from Node or Synthesized)
        Ok(full_resp_val)
    }

    pub fn error_response(&self, code: i32, message: &str) -> Value {
        serde_json::json!({
            "jsonrpc": "2.0",
            "id": 1,
            "error": {
                "code": code,
                "message": message
            }
        })
    }

    pub async fn resolve_name_service_address(&self, url: &str, name: &str) -> Result<String, AppError> {
        // suix_resolveNameServiceAddress takes [name, null, null] usually, or just [name]
        // Docs say: suix_resolveNameServiceAddress(name)
        let params = serde_json::json!([name]);
        
        let request_body = JsonRpcRequest {
            jsonrpc: "2.0",
            id: 1,
            method: "suix_resolveNameServiceAddress",
            params: &params,
        };

        let response = self.client.post(url)
            .json(&request_body)
            .send()
            .await
            .map_err(|e| AppError::ExternalService(format!("Network Error: {}", e)))?;

        if !response.status().is_success() {
            return Err(AppError::ExternalService(format!("HTTP Error: {}", response.status())));
        }

        let rpc_resp = response.json::<JsonRpcResponse>().await
            .map_err(|e| AppError::InternalError(format!("Failed to parse JSON: {}", e)))?;

        if let Some(err) = rpc_resp.error {
            return Err(AppError::ExternalService(format!("Resolution Error: {}", err)));
        }

        match rpc_resp.result {
            Some(Value::String(addr)) => Ok(addr),
            Some(_) => Err(AppError::InternalError("Unexpected result type for address resolution".into())),
            None => Err(AppError::NotFound(format!("Could not resolve name: {}", name))),
        }
    }
}
