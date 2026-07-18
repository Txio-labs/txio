use crate::chains::traits::ChainAdapter;
use crate::chains::validation::validate_sui_address;
use crate::cli::parser::Network;
use async_trait::async_trait;
use serde_json::{json, Value};
use anyhow::{Context, Result, anyhow};
use reqwest::Client;
use regex::Regex;
use std::sync::LazyLock;

/// Matches a candidate SuiNS token (`<label>.sui`).  The regex itself is
/// intentionally *not* anchored on the right — the `regex` crate has no
/// lookahead — so `resolve_names_in_value` performs a post-match boundary
/// check: a match is only treated as a SuiNS name when the character
/// immediately following it is absent or is not in `[A-Za-z0-9.-]`.  This
/// rejects `alice.sui2` and `alice.sui.evil.com` while still accepting
/// `alice.sui` anywhere it appears as a complete token.
static SUINS_REGEX: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"[a-zA-Z0-9-]+\.sui").expect("valid literal regex"));

/// Returns `true` when the character at byte position `end` in `s` is a
/// name-continuation character (`[A-Za-z0-9.-]`), meaning the regex match
/// ending there is part of a longer token and should **not** be treated as a
/// SuiNS name.
fn is_name_continuation(s: &str, end: usize) -> bool {
    s[end..].chars().next().map_or(false, |c| c.is_ascii_alphanumeric() || c == '.' || c == '-')
}

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
                // Collect the unique, boundary-checked SuiNS names present in
                // this string.  Using a Vec (with dedup) rather than a HashSet
                // preserves a stable iteration order for deterministic tests
                // while still preventing duplicate RPC round-trips.
                let mut unique_names: Vec<String> = Vec::new();
                for m in SUINS_REGEX.find_iter(s) {
                    // Post-match boundary check: reject matches that are
                    // immediately followed by a name-continuation character
                    // (e.g. `alice.sui2` → skip, `alice.sui.evil.com` → skip).
                    if is_name_continuation(s, m.end()) {
                        continue;
                    }
                    let name = m.as_str().to_string();
                    if !unique_names.contains(&name) {
                        unique_names.push(name);
                    }
                }

                if !unique_names.is_empty() {
                    // Resolve each unique name once, then apply all replacements.
                    let mut new_string = s.to_string();
                    for name in unique_names {
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

    /// The regex itself still finds a candidate inside `alice.sui2` and
    /// `alice.sui.evil.com`; the boundary helper must reject both.
    #[test]
    fn boundary_check_rejects_longer_tokens() {
        // alice.sui2  — digit follows immediately
        let s = "alice.sui2";
        let m = SUINS_REGEX.find(s).expect("regex matches the .sui prefix");
        assert!(
            is_name_continuation(s, m.end()),
            "alice.sui2 should be flagged as a longer token"
        );

        // alice.sui.evil.com  — dot follows immediately
        let s2 = "alice.sui.evil.com";
        let m2 = SUINS_REGEX.find(s2).expect("regex matches the .sui prefix");
        assert!(
            is_name_continuation(s2, m2.end()),
            "alice.sui.evil.com should be flagged as a longer token"
        );
    }

    /// A clean `alice.sui` at end-of-string or followed by whitespace must
    /// pass the boundary check.
    #[test]
    fn boundary_check_accepts_clean_sui_names() {
        let s = "alice.sui";
        let m = SUINS_REGEX.find(s).expect("regex matches");
        assert!(
            !is_name_continuation(s, m.end()),
            "alice.sui at end-of-string should not be a continuation"
        );

        let s2 = "send to alice.sui please";
        let m2 = SUINS_REGEX.find(s2).expect("regex matches");
        assert!(
            !is_name_continuation(s2, m2.end()),
            "alice.sui followed by space should not be a continuation"
        );
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

    /// A string containing the same SuiNS name twice must only trigger a
    /// single resolution RPC (the memo/dedup path).
    #[tokio::test]
    async fn duplicate_name_triggers_single_resolution_rpc() {
        use tokio::io::{AsyncReadExt, AsyncWriteExt};
        use tokio::net::TcpListener;

        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        let resolve_count = std::sync::Arc::new(std::sync::atomic::AtomicUsize::new(0));
        let counter = resolve_count.clone();

        let server = tokio::spawn(async move {
            // Allow up to 3 requests but record how many resolve calls arrive.
            for _ in 0..3 {
                let Ok((mut socket, _)) = listener.accept().await else { break };
                let mut buf = vec![0u8; 8192];
                let Ok(n) = socket.read(&mut buf).await else { break };
                let request = String::from_utf8_lossy(&buf[..n]).to_string();
                let (result, is_resolve) =
                    if request.contains("suix_resolveNameServiceAddress") {
                        counter.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
                        ("\"0xdeadbeef\"", true)
                    } else {
                        ("\"ok\"", false)
                    };
                let _ = is_resolve;
                let body = format!("{{\"jsonrpc\":\"2.0\",\"id\":1,\"result\":{result}}}");
                let response = format!(
                    "HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{}",
                    body.len(),
                    body
                );
                let _ = socket.write_all(response.as_bytes()).await;
            }
        });

        let adapter = SuiAdapter::with_rpc(Some(format!("http://{addr}")), Network::Localnet);
        // alice.sui appears twice in the same string value.
        let result = adapter
            .call_rpc("suix_getAllBalances", json!(["alice.sui and alice.sui"]))
            .await
            .unwrap();
        assert_eq!(result, json!("ok"));
        server.await.unwrap();

        assert_eq!(
            resolve_count.load(std::sync::atomic::Ordering::SeqCst),
            1,
            "duplicate name must resolve exactly once"
        );
    }
}
