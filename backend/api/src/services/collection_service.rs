use crate::model::{collection::Collection, request::SavedRequest};
use crate::repositories::{
    collection_repository::CollectionRepository, request_repository::RequestRepository,
    user_repository::UserRepository, workspace_repository::WorkspaceRepository,
};
use crate::services::sui_service::SuiService;
use crate::utils::error::AppError;
use mongodb::bson::oid::ObjectId;
use serde_json::Value;
use url::{Host, Url};

/// Returns `true` when the character at byte position `end` in `s` is a
/// name-continuation character (`[A-Za-z0-9.-]`), meaning the regex match
/// ending there is part of a longer token and should **not** be treated as a
/// SuiNS name.
/// Ported from `cli/src/chains/sui.rs` to fix the same class of bug as issue #73.
fn is_name_continuation(s: &str, end: usize) -> bool {
    s[end..]
        .chars()
        .next()
        .is_some_and(|c| c.is_ascii_alphanumeric() || c == '.' || c == '-')
}

#[derive(Clone)]
pub struct CollectionService {
    collection_repo: CollectionRepository,
    request_repo: RequestRepository,
    user_repo: UserRepository,
    workspace_repo: WorkspaceRepository,
    sui_service: SuiService,
}

impl CollectionService {
    pub fn new(
        collection_repo: CollectionRepository,
        request_repo: RequestRepository,
        user_repo: UserRepository,
        workspace_repo: WorkspaceRepository,
        sui_service: SuiService,
    ) -> Self {
        Self {
            collection_repo,
            request_repo,
            user_repo,
            workspace_repo,
            sui_service,
        }
    }

    async fn ensure_workspace_owner(
        &self,
        workspace_id: ObjectId,
        user_id: ObjectId,
    ) -> Result<(), AppError> {
        let workspace = self.workspace_repo.find_by_id(workspace_id).await?;

        if workspace.user_id != user_id {
            return Err(AppError::Forbidden(
                "Not authorized to access this workspace".into(),
            ));
        }

        Ok(())
    }
    fn validate_url(url_str: &str) -> Result<(), AppError> {
        // Parse URL
        let url = Url::parse(url_str)
            .map_err(|e| AppError::BadRequest(format!("Invalid RPC URL: {e}")))?;
        // Only allow HTTPS scheme
        if url.scheme() != "https" {
            return Err(AppError::BadRequest(
                "Only HTTPS RPC URLs are allowed".into(),
            ));
        }

        match url.host() {
            Some(Host::Domain(host)) if host.eq_ignore_ascii_case("localhost") => {
                return Err(AppError::BadRequest(
                    "Localhost URLs are not allowed".into(),
                ));
            }
            Some(Host::Ipv4(v4)) => {
                if v4.is_loopback() || v4.is_private() || v4.is_link_local() {
                    return Err(AppError::BadRequest(
                        "Private or link-local IP addresses are not allowed".into(),
                    ));
                }
            }
            Some(Host::Ipv6(v6)) => {
                if v6.is_loopback() || v6.is_unique_local() || v6.is_unicast_link_local() {
                    return Err(AppError::BadRequest(
                        "Private or link-local IP addresses are not allowed".into(),
                    ));
                }
            }
            Some(Host::Domain(_)) | None => {}
        }

        Ok(())
    }

    // --- Collections ---

    pub async fn create_collection(
        &self,
        user_id: ObjectId,
        workspace_id: ObjectId,
        name: String,
        description: Option<String>,
    ) -> Result<Collection, AppError> {
        self.ensure_workspace_owner(workspace_id, user_id).await?;

        let new_collection = Collection::new(user_id, Some(workspace_id), name, description);
        self.collection_repo.save(&new_collection).await
    }

    pub async fn get_user_collections(
        &self,
        user_id: ObjectId,
        workspace_id: Option<ObjectId>,
    ) -> Result<Vec<Collection>, AppError> {
        if let Some(workspace_id) = workspace_id {
            self.ensure_workspace_owner(workspace_id, user_id).await?;

            return self
                .collection_repo
                .find_all_by_user_and_workspace(user_id, workspace_id)
                .await;
        }

        self.collection_repo.find_all_by_user(user_id).await
    }

    pub async fn get_collection(
        &self,
        collection_id: ObjectId,
        user_id: ObjectId,
    ) -> Result<Collection, AppError> {
        let collection = self.collection_repo.find_by_id(collection_id).await?;
        if collection.user_id != user_id {
            return Err(AppError::Forbidden(
                "Not authorized to access this collection".into(),
            ));
        }
        Ok(collection)
    }

    pub async fn update_collection(
        &self,
        collection_id: ObjectId,
        user_id: ObjectId,
        name: String,
        description: Option<String>,
    ) -> Result<Collection, AppError> {
        let mut collection = self.get_collection(collection_id, user_id).await?;
        collection.name = name;
        collection.description = description;
        collection.updated_at = chrono::Utc::now();
        self.collection_repo.update(&collection).await
    }

    pub async fn delete_collection(
        &self,
        collection_id: ObjectId,
        user_id: ObjectId,
    ) -> Result<(), AppError> {
        let _collection = self.get_collection(collection_id, user_id).await?;
        // Cascade delete requests
        self.request_repo
            .delete_all_by_collection(collection_id)
            .await?;
        self.collection_repo.delete(collection_id).await?;
        Ok(())
    }

    // --- Requests ---

    #[allow(clippy::too_many_arguments)]
    pub async fn add_request(
        &self,
        user_id: ObjectId,
        collection_id: ObjectId,
        name: String,
        method: String,
        params: Value,
        network: Option<String>,
        rpc_url: Option<String>,
    ) -> Result<SavedRequest, AppError> {
        // Verify ownership/existence of collection
        let _ = self.get_collection(collection_id, user_id).await?;

        let new_req = SavedRequest::new(
            collection_id,
            user_id,
            name,
            method,
            params,
            network,
            rpc_url,
        );
        self.request_repo.save(&new_req).await
    }

    pub async fn get_collection_requests(
        &self,
        collection_id: ObjectId,
        user_id: ObjectId,
    ) -> Result<Vec<SavedRequest>, AppError> {
        // Verify ownership
        let _ = self.get_collection(collection_id, user_id).await?;
        self.request_repo
            .find_all_by_collection(collection_id)
            .await
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn update_request(
        &self,
        request_id: ObjectId,
        user_id: ObjectId,
        name: Option<String>,
        method: Option<String>,
        params: Option<Value>,
        // `Some(None)` means "clear this field"; `Some(Some(v))` means "set it to v";
        // `None` means the field was omitted from the request and should be left untouched.
        network: Option<Option<String>>,
        rpc_url: Option<Option<String>>,
        last_response: Option<Option<Value>>, // Allow manual update of response (e.g. paste from UI)
    ) -> Result<SavedRequest, AppError> {
        let mut req = self.request_repo.find_by_id(request_id).await?;
        if req.user_id != user_id {
            return Err(AppError::Forbidden("Not authorized".into()));
        }

        if let Some(n) = name {
            req.name = n;
        }
        if let Some(m) = method {
            req.method = m;
        }
        if let Some(p) = params {
            req.params = p;
        }

        if let Some(network) = network {
            req.network = network;
        }
        if let Some(rpc_url) = rpc_url {
            req.rpc_url = rpc_url;
        }
        if let Some(last_response) = last_response {
            req.last_response = last_response;
        }

        req.updated_at = chrono::Utc::now();
        self.request_repo.update(&req).await
    }

    pub async fn delete_request(
        &self,
        request_id: ObjectId,
        user_id: ObjectId,
    ) -> Result<(), AppError> {
        let req = self.request_repo.find_by_id(request_id).await?;
        if req.user_id != user_id {
            return Err(AppError::Forbidden("Not authorized".into()));
        }
        self.request_repo.delete(request_id).await
    }

    pub async fn execute_request(
        &self,
        request_id: ObjectId,
        user_id: ObjectId,
    ) -> Result<(SavedRequest, Value), AppError> {
        let mut req = self.request_repo.find_by_id(request_id).await?;
        if req.user_id != user_id {
            return Err(AppError::Forbidden("Not authorized".into()));
        }

        // Determine RPC URL first (needed for resolution and main call)
        let final_url = if let Some(ref url) = req.rpc_url {
            url.clone()
        } else {
            let network_enum = if let Some(ref net_str) = req.network {
                match net_str.to_lowercase().as_str() {
                    "mainnet" => crate::model::network::Network::Mainnet,
                    "testnet" => crate::model::network::Network::Testnet,
                    "devnet" => crate::model::network::Network::Devnet,
                    _ => crate::model::network::Network::Mainnet,
                }
            } else {
                let user = self.user_repo.find_by_id(&user_id).await?;
                user.network
            };
            network_enum.sui_url().to_string()
        };
        Self::validate_url(&final_url)?;
        // 1. Resolve Parameters (SuiNS)
        let mut final_params = req.params.clone();
        if let Err((code, msg)) = self
            .resolve_suins_params(&final_url, &mut final_params)
            .await
        {
            let err_val = self.sui_service.error_response(code, &msg);
            let mut updated_req = req.clone();
            updated_req.last_response = Some(err_val.clone());
            updated_req.last_executed_at = Some(chrono::Utc::now());
            self.request_repo.update(&updated_req).await?;
            return Ok((updated_req, err_val));
        }

        // 3. Execute
        let result = self
            .sui_service
            .call_rpc_direct(&final_url, user_id, &req.method, &final_params)
            .await?;

        // 4. Update Request History
        req.last_response = Some(result.clone());
        req.last_executed_at = Some(chrono::Utc::now());
        self.request_repo.update(&req).await?;

        Ok((req, result))
    }

    async fn resolve_suins_params(
        &self,
        final_url: &str,
        final_params: &mut Value,
    ) -> Result<(), (i32, String)> {
        let suins_regex = regex::Regex::new(r"[a-zA-Z0-9-]+\.sui").unwrap();
        if let Some(arr) = final_params.as_array_mut() {
            for v in arr.iter_mut() {
                if let Some(s) = v.as_str() {
                    let mut spans: Vec<(usize, usize, String)> = Vec::new();
                    for m in suins_regex.find_iter(s) {
                        if !is_name_continuation(s, m.end()) {
                            spans.push((m.start(), m.end(), m.as_str().to_string()));
                        }
                    }

                    if !spans.is_empty() {
                        let mut name_to_addr = std::collections::HashMap::new();
                        for (_, _, name) in &spans {
                            if !name_to_addr.contains_key(name) {
                                match self
                                    .sui_service
                                    .resolve_name_service_address(final_url, name)
                                    .await
                                {
                                    Ok(addr) => {
                                        name_to_addr.insert(name.clone(), addr);
                                    }
                                    Err(e) => {
                                        return Err((
                                            -32002,
                                            format!("SuiNS Resolution Error for '{name}': {e}"),
                                        ));
                                    }
                                }
                            }
                        }

                        let original = s;
                        let mut new_string = String::with_capacity(original.len());
                        let mut last_end = 0usize;
                        for (start, end, name) in spans {
                            new_string.push_str(&original[last_end..start]);
                            if let Some(addr) = name_to_addr.get(&name) {
                                new_string.push_str(addr);
                            } else {
                                new_string.push_str(&original[start..end]);
                            }
                            last_end = end;
                        }
                        new_string.push_str(&original[last_end..]);

                        *v = Value::String(new_string);
                    }
                }
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_url_allowed() {
        assert!(CollectionService::validate_url("https://api.mainnet.sui.io").is_ok());
        assert!(CollectionService::validate_url("https://fullnode.devnet.sui.io:443/").is_ok());
    }

    #[test]
    fn test_validate_url_blocked_http() {
        assert!(CollectionService::validate_url("http://api.mainnet.sui.io").is_err());
        assert!(CollectionService::validate_url("http://1.1.1.1").is_err());
    }

    #[test]
    fn test_validate_url_blocked_localhost() {
        assert!(CollectionService::validate_url("https://localhost").is_err());
        assert!(CollectionService::validate_url("https://localhost:443").is_err());
        assert!(CollectionService::validate_url("https://127.0.0.1").is_err());
        assert!(CollectionService::validate_url("https://[::1]").is_err());
    }

    #[test]
    fn test_validate_url_blocked_private_ip() {
        // IPv4 private ranges
        assert!(CollectionService::validate_url("https://10.0.0.1").is_err());
        assert!(CollectionService::validate_url("https://172.16.0.1").is_err());
        assert!(CollectionService::validate_url("https://192.168.1.1").is_err());

        // IPv6 unique local addresses (ULA)
        assert!(CollectionService::validate_url("https://[fc00::1]").is_err());
        assert!(CollectionService::validate_url("https://[fd00::1]").is_err());
    }

    #[test]
    fn test_validate_url_blocked_link_local() {
        assert!(CollectionService::validate_url("https://169.254.169.254").is_err());
        assert!(CollectionService::validate_url("https://[fe80::1]").is_err());
    }

    #[test]
    fn test_validate_url_invalid_urls() {
        assert!(CollectionService::validate_url("not_a_url").is_err());
        assert!(CollectionService::validate_url("https://").is_err());
    }

    // --- Mocking utilities for testing resolve_suins_params ---
    use mongodb::Client;

    async fn dummy_collection_service() -> CollectionService {
        let client = Client::with_uri_str("mongodb://localhost:27017")
            .await
            .expect("parsing a well-formed URI must not require a live connection");
        let db = client.database("txio_db");

        let collection_repo = CollectionRepository::new(&db);
        let request_repo = RequestRepository::new(&db);
        let user_repo = UserRepository::new(&db);
        let workspace_repo = WorkspaceRepository::new(&db);
        let rpc_repo = crate::repositories::rpc_repository::RpcRepository::new(&db);

        let sui_service = SuiService::new(rpc_repo, "https://dummy.sui.io".to_string());

        CollectionService::new(
            collection_repo,
            request_repo,
            user_repo,
            workspace_repo,
            sui_service,
        )
    }

    #[tokio::test]
    async fn suins_standalone_name_resolves() {
        use tokio::io::{AsyncReadExt, AsyncWriteExt};
        use tokio::net::TcpListener;

        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();

        let server = tokio::spawn(async move {
            let (mut socket, _) = listener.accept().await.unwrap();
            let mut buf = vec![0u8; 8192];
            let _ = socket.read(&mut buf).await.unwrap();

            let body = "{\"jsonrpc\":\"2.0\",\"id\":1,\"result\":\"0x123\"}".to_string();
            let response = format!(
                "HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{}",
                body.len(),
                body
            );
            socket.write_all(response.as_bytes()).await.unwrap();
        });

        let service = dummy_collection_service().await;
        let mut params = serde_json::json!(["send 5 SUI to alice.sui now"]);

        service
            .resolve_suins_params(&format!("http://{addr}"), &mut params)
            .await
            .unwrap();

        assert_eq!(params[0].as_str().unwrap(), "send 5 SUI to 0x123 now");
        server.await.unwrap();
    }

    #[tokio::test]
    async fn suins_embedded_substring_untouched() {
        let service = dummy_collection_service().await;
        // Since there is no mock server, if it tries to resolve, it will fail and return Err.
        let mut params = serde_json::json!(["invoice.suicide"]);
        service
            .resolve_suins_params("http://127.0.0.1:1", &mut params)
            .await
            .unwrap();
        assert_eq!(params[0].as_str().unwrap(), "invoice.suicide");
    }

    #[tokio::test]
    async fn suins_embedded_in_url_untouched() {
        let service = dummy_collection_service().await;
        let mut params = serde_json::json!(["attacker.sui.evil.com"]);
        service
            .resolve_suins_params("http://127.0.0.1:1", &mut params)
            .await
            .unwrap();
        assert_eq!(params[0].as_str().unwrap(), "attacker.sui.evil.com");
    }

    #[tokio::test]
    async fn suins_mixed_case() {
        use tokio::io::{AsyncReadExt, AsyncWriteExt};
        use tokio::net::TcpListener;

        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();

        let server = tokio::spawn(async move {
            let (mut socket, _) = listener.accept().await.unwrap();
            let mut buf = vec![0u8; 8192];
            let n = socket.read(&mut buf).await.unwrap();
            let request = String::from_utf8_lossy(&buf[..n]).to_string();
            assert!(request.contains("alice.sui"));

            let body = "{\"jsonrpc\":\"2.0\",\"id\":1,\"result\":\"0x123\"}".to_string();
            let response = format!(
                "HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{}",
                body.len(),
                body
            );
            socket.write_all(response.as_bytes()).await.unwrap();
        });

        let service = dummy_collection_service().await;
        let mut params =
            serde_json::json!(["alice.sui and invoice.suicide and attacker.sui.evil.com"]);

        service
            .resolve_suins_params(&format!("http://{addr}"), &mut params)
            .await
            .unwrap();

        assert_eq!(
            params[0].as_str().unwrap(),
            "0x123 and invoice.suicide and attacker.sui.evil.com"
        );
        server.await.unwrap();
    }

    #[tokio::test]
    async fn suins_nested_json_params_untouched() {
        let service = dummy_collection_service().await;
        // The original logic only scanned strings directly in the params array.
        // Nested objects/arrays containing strings with .sui shouldn't be matched.
        let mut params = serde_json::json!([
            { "name": "alice.sui" },
            ["bob.sui"]
        ]);

        // This will succeed instantly without hitting the (nonexistent) server
        service
            .resolve_suins_params("http://127.0.0.1:1", &mut params)
            .await
            .unwrap();

        assert_eq!(params[0]["name"].as_str().unwrap(), "alice.sui");
        assert_eq!(params[1][0].as_str().unwrap(), "bob.sui");
    }

    #[tokio::test]
    async fn suins_unregistered_resolution_errors() {
        use tokio::io::{AsyncReadExt, AsyncWriteExt};
        use tokio::net::TcpListener;

        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();

        let server = tokio::spawn(async move {
            let (mut socket, _) = listener.accept().await.unwrap();
            let mut buf = vec![0u8; 8192];
            let _ = socket.read(&mut buf).await.unwrap();

            // result: null indicates no resolution found
            let body = "{\"jsonrpc\":\"2.0\",\"id\":1,\"result\":null}".to_string();
            let response = format!(
                "HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{}",
                body.len(),
                body
            );
            socket.write_all(response.as_bytes()).await.unwrap();
        });

        let service = dummy_collection_service().await;
        let mut params = serde_json::json!(["unknown.sui"]);

        let err = service
            .resolve_suins_params(&format!("http://{addr}"), &mut params)
            .await
            .unwrap_err();
        assert_eq!(err.0, -32002);
        assert!(err.1.contains("SuiNS Resolution Error for 'unknown.sui'"));

        server.await.unwrap();
    }
}
