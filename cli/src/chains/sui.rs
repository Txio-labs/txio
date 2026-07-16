use crate::chains::traits::ChainAdapter;
use crate::chains::validation::validate_sui_address;
use crate::cli::parser::Network;
use async_trait::async_trait;
use serde_json::{json, Value};
use anyhow::{Context, Result, anyhow};
use reqwest::Client;
use regex::Regex;
use std::sync::LazyLock;

static SUINS_REGEX: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"([a-zA-Z0-9-]+\.sui)").expect("valid literal regex"));

pub struct SuiAdapter {
    client: Client,
    rpc_url: String,
}

impl SuiAdapter {
    pub fn new() -> Self {
        Self::with_rpc(None, Network::Mainnet)
    }

    pub fn with_rpc(rpc_url: Option<String>, network: Network) -> Self {
        let url = rpc_url.unwrap_or_else(|| match network {
            Network::Mainnet => "https://fullnode.mainnet.sui.io".to_string(),
            Network::Testnet => "https://fullnode.testnet.sui.io".to_string(),
            Network::Devnet => "https://fullnode.devnet.sui.io".to_string(),
            Network::Localnet => "http://127.0.0.1:9000".to_string(),
        });

        Self {
            client: Client::builder()
                .timeout(std::time::Duration::from_secs(30))
                .build()
                .unwrap_or_else(|_| Client::new()),
            rpc_url: url,
        }
    }

    async fn call_rpc_internal(&self, method: &str, params: Value) -> Result<Value> {
        let payload = json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": method,
            "params": params
        });

        let response = self.client.post(&self.rpc_url)
            .json(&payload)
            .send()
            .await?;

        let body: Value = response.json().await?;
        if let Some(error) = body.get("error") {
            let msg = error.get("message").and_then(|m| m.as_str()).unwrap_or("Unknown RPC Error");
            let data = error.get("data").and_then(|d| d.as_str()).unwrap_or("");
            let code = error.get("code").and_then(|c| c.as_i64()).unwrap_or(0);

            let err_str = if data.is_empty() {
                format!("{} (Code: {})", msg, code)
            } else {
                format!("{} - {} (Code: {})", msg, data, code)
            };
            return Err(anyhow!("{}", err_str));
        }

        Ok(body.get("result").cloned().unwrap_or(Value::Null))
    }

    async fn resolve_names_in_value(&self, value: &mut Value) -> Result<()> {
        match value {
            Value::String(s) => {
                if SUINS_REGEX.is_match(s) {
                    let mut new_string = s.to_string();
                    let matches: Vec<String> = SUINS_REGEX
                        .find_iter(s)
                        .map(|m| m.as_str().to_string())
                        .collect();

                    for name in matches {
                        if let Some(addr) = self
                            .resolve_name(&name)
                            .await
                            .with_context(|| format!("resolving Sui name {name}"))?
                        {
                            new_string = new_string.replace(&name, &addr);
                        }
                    }
                    *s = new_string;
                }
            }
            Value::Array(arr) => {
                for v in arr.iter_mut() {
                    Box::pin(self.resolve_names_in_value(v)).await?;
                }
            }
            Value::Object(map) => {
                for v in map.values_mut() {
                    Box::pin(self.resolve_names_in_value(v)).await?;
                }
            }
            _ => {}
        }
        Ok(())
    }
}

#[async_trait]
impl ChainAdapter for SuiAdapter {
    fn name(&self) -> &'static str {
        "Sui"
    }

    fn default_rpc(&self) -> &'static str {
        "https://fullnode.mainnet.sui.io"
    }

    async fn call_rpc(&self, method: &str, mut params: Value) -> Result<Value> {
        self.resolve_names_in_value(&mut params).await?;
        self.call_rpc_internal(method, params).await
    }

    async fn resolve_name(&self, name: &str) -> Result<Option<String>> {
        if !name.ends_with(".sui") {
            return Ok(None);
        }
        let params = json!([name]);
        let result = self.call_rpc_internal("suix_resolveNameServiceAddress", params).await?;
        Ok(result.as_str().map(|s| s.to_string()))
    }

    async fn get_balance(&self, address: &str) -> Result<Value> {
        let address = validate_sui_address(address)?;
        let params = json!([address]);
        self.call_rpc("suix_getAllBalances", params).await
    }

    async fn get_transaction(&self, hash: &str) -> Result<Value> {
        let params = json!([
            hash,
            {
                "showInput": true,
                "showEffects": true,
                "showEvents": true,
                "showObjectChanges": true,
                "showBalanceChanges": true
            }
        ]);
        self.call_rpc_internal("sui_getTransactionBlock", params).await
    }

    async fn get_block(&self, block: Option<u64>) -> Result<Value> {
        if let Some(seq) = block {
            let params = json!([seq.to_string()]);
            self.call_rpc_internal("sui_getCheckpoint", params).await
        } else {
            let seq = self.call_rpc_internal("sui_getLatestCheckpointSequenceNumber", json!([])).await?;
            let params = json!([seq]);
            self.call_rpc_internal("sui_getCheckpoint", params).await
        }
    }

    async fn get_gas_price(&self) -> Result<Value> {
        self.call_rpc_internal("suix_getReferenceGasPrice", json!([])).await
    }

    async fn get_account(&self, id: &str) -> Result<Value> {
        let params = json!([
            id,
            { "showType": true, "showContent": true, "showOwner": true, "showDisplay": true }
        ]);
        self.call_rpc_internal("sui_getObject", params).await
    }

    async fn get_history(&self, address: &str, limit: u32) -> Result<Value> {
        let address = validate_sui_address(address)?;
        let params = json!([
            {
                "filter": { "FromAddress": address },
                "options": { "showInput": true, "showEffects": true }
            },
            null,
            limit,
            true
        ]);
        self.call_rpc_internal("suix_queryTransactionBlocks", params).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn suins_regex_matches_name_inside_string() {
        assert!(SUINS_REGEX.is_match("send 5 SUI to alice.sui now"));
        let matches: Vec<&str> = SUINS_REGEX
            .find_iter("move alice.sui to bob.sui")
            .map(|m| m.as_str())
            .collect();
        assert_eq!(matches, vec!["alice.sui", "bob.sui"]);
    }

    #[test]
    fn suins_regex_ignores_non_matching_strings() {
        assert!(!SUINS_REGEX.is_match("plain string"));
        assert!(!SUINS_REGEX.is_match("no-dot-sui"));
        assert!(!SUINS_REGEX.is_match("alice.SUI"));
        assert!(!SUINS_REGEX.is_match("0x1234abcd"));
    }

    #[tokio::test]
    async fn resolution_error_propagates_with_name_context() {
        // Port 1 refuses connections, so the resolver RPC fails. The error must
        // surface (not be swallowed by the array/object recursion arms) and must
        // name the SuiNS name that failed to resolve.
        let adapter =
            SuiAdapter::with_rpc(Some("http://127.0.0.1:1".to_string()), Network::Localnet);
        let err = adapter
            .call_rpc("suix_getAllBalances", json!([{ "address": "hello.sui" }]))
            .await
            .expect_err("resolution failure must propagate");
        assert!(
            err.to_string().contains("resolving Sui name hello.sui"),
            "unexpected error: {err:#}"
        );
    }

    #[tokio::test]
    async fn unresolvable_name_is_left_as_literal() {
        use tokio::io::{AsyncReadExt, AsyncWriteExt};
        use tokio::net::TcpListener;

        // Minimal mock JSON-RPC server. First request is the SuiNS lookup and
        // answers `result: null` (name has no record => Ok(None)); the second is
        // the real method call, whose params must still carry the literal name.
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        let bodies = std::sync::Arc::new(std::sync::Mutex::new(Vec::new()));
        let recorded = bodies.clone();

        let server = tokio::spawn(async move {
            for _ in 0..2 {
                let (mut socket, _) = listener.accept().await.unwrap();
                let mut buf = vec![0u8; 8192];
                let n = socket.read(&mut buf).await.unwrap();
                let request = String::from_utf8_lossy(&buf[..n]).to_string();
                recorded.lock().unwrap().push(request.clone());
                let result = if request.contains("suix_resolveNameServiceAddress") {
                    "null"
                } else {
                    "\"ok\""
                };
                let body = format!("{{\"jsonrpc\":\"2.0\",\"id\":1,\"result\":{result}}}");
                let response = format!(
                    "HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{}",
                    body.len(),
                    body
                );
                socket.write_all(response.as_bytes()).await.unwrap();
            }
        });

        let adapter = SuiAdapter::with_rpc(Some(format!("http://{addr}")), Network::Localnet);
        let result = adapter
            .call_rpc("suix_getAllBalances", json!(["unknown.sui"]))
            .await
            .unwrap();
        assert_eq!(result, json!("ok"));
        server.await.unwrap();

        let bodies = bodies.lock().unwrap();
        assert_eq!(bodies.len(), 2);
        assert!(bodies[0].contains("suix_resolveNameServiceAddress"));
        assert!(
            bodies[1].contains("unknown.sui"),
            "literal .sui name must stay in params: {}",
            bodies[1]
        );
    }
}
