use crate::model::{collection::Collection, request::SavedRequest};
use crate::repositories::{
    collection_repository::CollectionRepository, request_repository::RequestRepository,
    user_repository::UserRepository, workspace_repository::WorkspaceRepository,
};
use crate::services::sui_service::SuiService;
use crate::utils::error::AppError;
use mongodb::{Database, bson::oid::ObjectId};
use serde_json::Value;
use std::net::IpAddr;
use url::{Host, Url};

#[derive(Clone)]
pub struct CollectionService {
    db: Database,
    collection_repo: CollectionRepository,
    request_repo: RequestRepository,
    user_repo: UserRepository,
    workspace_repo: WorkspaceRepository,
    sui_service: SuiService,
}

impl CollectionService {
    pub fn new(
        db: Database,
        collection_repo: CollectionRepository,
        request_repo: RequestRepository,
        user_repo: UserRepository,
        workspace_repo: WorkspaceRepository,
        sui_service: SuiService,
    ) -> Self {
        Self {
            db,
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
    
    /// Validate a user-supplied RPC URL, blocking private, loopback, link-local,
    /// and metadata addresses whether they are supplied as literals or as hostnames
    /// that resolve to those ranges.
    ///
    /// The check is performed in two passes:
    ///  1. Static checks — scheme, literal "localhost", literal IP ranges.
    ///  2. DNS resolution — every address the hostname resolves to is checked
    ///     against the same disallowed ranges. This closes the bypass where a
    ///     public-looking hostname resolves to an internal address (DNS
    ///     rebinding, split-horizon DNS, cloud metadata service endpoints, etc.).
    async fn validate_url(url_str: &str) -> Result<(), AppError> {
        let url = Url::parse(url_str)
            .map_err(|e| AppError::BadRequest(format!("Invalid RPC URL: {}", e)))?;

        if url.scheme() != "https" {
            return Err(AppError::BadRequest(
                "Only HTTPS RPC URLs are allowed".into(),
            ));
        }

        let host = url.host().ok_or_else(|| AppError::BadRequest("URL must include a host".into()))?;

        match host {
            Host::Domain(domain) => {
                if domain.eq_ignore_ascii_case("localhost") {
                    return Err(AppError::BadRequest("Localhost URLs are not allowed".into()));
                }

                let port = url.port_or_known_default().unwrap_or(443);
                let lookup_target = format!("{}:{}", domain, port);

                let addrs = tokio::net::lookup_host(&lookup_target).await.map_err(|e| {
                    AppError::BadRequest(format!(
                        "DNS resolution failed for '{}': {}",
                        domain, e
                    ))
                })?;

                for addr in addrs {
                    Self::check_ip_allowed(addr.ip())?;
                }
            }
            Host::Ipv4(v4) => Self::check_ip_allowed(IpAddr::V4(v4))?,
            Host::Ipv6(v6) => Self::check_ip_allowed(IpAddr::V6(v6))?,
        }

        Ok(())
    }

    fn check_ip_allowed(ip: IpAddr) -> Result<(), AppError> {
        let is_disallowed = match ip {
            IpAddr::V4(v4) => v4.is_loopback() || v4.is_private() || v4.is_link_local(),
            IpAddr::V6(v6) => {
                // Fold IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1) through
                // to their IPv4 equivalent so they cannot bypass the IPv4 checks.
                if let Some(v4) = v6.to_ipv4() {
                    v4.is_loopback() || v4.is_private() || v4.is_link_local()
                } else {
                    v6.is_loopback() || v6.is_unique_local() || v6.is_unicast_link_local()
                }
            }
        };
        if is_disallowed {
            return Err(AppError::BadRequest(format!(
                "Resolved address {} is not allowed (loopback, private, link-local, or metadata range)",
                ip
            )));
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
        self.ensure_workspace_owner(workspace_id.clone(), user_id.clone())
            .await?;

        let new_collection = Collection::new(user_id, Some(workspace_id), name, description);
        self.collection_repo.save(&new_collection).await
    }

    pub async fn get_user_collections(
        &self,
        user_id: ObjectId,
        workspace_id: Option<ObjectId>,
    ) -> Result<Vec<Collection>, AppError> {
        if let Some(workspace_id) = workspace_id {
            self.ensure_workspace_owner(workspace_id.clone(), user_id.clone())
                .await?;

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

        // Wrap both deletes in a MongoDB transaction so they succeed or fail
        // together. Without this, a failure between the two operations leaves
        // the collection alive with its child requests permanently gone, or
        // (in the previous order) requests gone while the empty collection
        // remains — either state is unrecoverable without manual intervention.
        let mut session = self.db.client().start_session(None).await?;
        session.start_transaction(None).await?;

        let result = async {
            self.request_repo
                .delete_all_by_collection_with_session(collection_id, &mut session)
                .await?;
            self.collection_repo
                .delete_with_session(collection_id, &mut session)
                .await?;
            Ok::<(), AppError>(())
        }
        .await;

        match result {
            Ok(()) => {
                session.commit_transaction().await?;
                Ok(())
            }
            Err(e) => {
                let _ = session.abort_transaction().await;
                Err(e)
            }
        }
    }

    // --- Requests ---

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

    pub async fn update_request(
        &self,
        request_id: ObjectId,
        user_id: ObjectId,
        name: Option<String>,
        method: Option<String>,
        params: Option<Value>,
        network: Option<String>,
        rpc_url: Option<String>,
        last_response: Option<Value>, // Allow manual update of response (e.g. paste from UI)
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

        // Always update options if provided (even separate None vs Some(None) is tricky here, assuming override if Some)
        // Simple merge strategy: if passed, update.
        if network.is_some() {
            req.network = network;
        }
        if rpc_url.is_some() {
            req.rpc_url = rpc_url;
        }
        if last_response.is_some() {
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
                    "mainnet" => crate::model::user::SuiNetwork::Mainnet,
                    "testnet" => crate::model::user::SuiNetwork::Testnet,
                    "devnet" => crate::model::user::SuiNetwork::Devnet,
                    _ => crate::model::user::SuiNetwork::Mainnet,
                }
            } else {
                let user = self.user_repo.find_by_id(&user_id).await?;
                user.network
            };
            network_enum.url().to_string()
        };
        Self::validate_url(&final_url).await?;
        // 1. Resolve Parameters (SuiNS)
        let suins_regex = regex::Regex::new(r"([a-zA-Z0-9-]+\.sui)").unwrap();
        let mut final_params = req.params.clone();
        if let Some(arr) = final_params.as_array_mut() {
            for v in arr.iter_mut() {
                if let Some(s) = v.as_str() {
                    if suins_regex.is_match(s) {
                        let mut new_string = s.to_string();
                        let mut replacements = Vec::new();
                        for cap in suins_regex.captures_iter(s) {
                            if let Some(m) = cap.get(0) {
                                replacements.push(m.as_str().to_string());
                            }
                        }

                        for name in replacements {
                            match self
                                .sui_service
                                .resolve_name_service_address(&final_url, &name)
                                .await
                            {
                                Ok(addr) => {
                                    new_string = new_string.replace(&name, &addr);
                                }
                                Err(e) => {
                                    // Synthesis: Return resolution error as JSON-RPC error
                                    let err_val = self.sui_service.error_response(
                                        -32002,
                                        &format!("SuiNS Resolution Error for '{}': {}", name, e),
                                    );

                                    // Update history before early return
                                    let mut updated_req = req.clone();
                                    updated_req.last_response = Some(err_val.clone());
                                    updated_req.last_executed_at = Some(chrono::Utc::now());
                                    self.request_repo.update(&updated_req).await?;

                                    return Ok((updated_req, err_val));
                                }
                            }
                        }

                        if new_string != *s {
                            *v = Value::String(new_string);
                        }
                    }
                }
            }
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
}

#[cfg(test)]
mod tests {
    use super::*;

    // validate_url is now async (it performs DNS resolution for hostname URLs).
    // Tests that use literal IP addresses exercise the fast path with no DNS
    // and are not flaky. Hostname-based "allowed" assertions are intentionally
    // omitted here because they would require live DNS in CI; those are covered
    // by integration tests that run against a real network.

    #[tokio::test]
    async fn test_validate_url_blocked_http() {
        assert!(CollectionService::validate_url("http://1.1.1.1").await.is_err());
        assert!(CollectionService::validate_url("http://203.0.113.1").await.is_err());
    }

    #[tokio::test]
    async fn test_validate_url_blocked_localhost_name() {
        assert!(CollectionService::validate_url("https://localhost").await.is_err());
        assert!(CollectionService::validate_url("https://localhost:443").await.is_err());
        assert!(CollectionService::validate_url("https://LOCALHOST").await.is_err());
    }

    #[tokio::test]
    async fn test_validate_url_blocked_loopback_ip() {
        assert!(CollectionService::validate_url("https://127.0.0.1").await.is_err());
        assert!(CollectionService::validate_url("https://127.255.255.255").await.is_err());
        assert!(CollectionService::validate_url("https://[::1]").await.is_err());
    }

    #[tokio::test]
    async fn test_validate_url_blocked_private_ip() {
        // RFC 1918 IPv4 private ranges
        assert!(CollectionService::validate_url("https://10.0.0.1").await.is_err());
        assert!(CollectionService::validate_url("https://172.16.0.1").await.is_err());
        assert!(CollectionService::validate_url("https://192.168.1.1").await.is_err());
        // IPv6 unique-local (ULA)
        assert!(CollectionService::validate_url("https://[fc00::1]").await.is_err());
        assert!(CollectionService::validate_url("https://[fd00::1]").await.is_err());
    }

    #[tokio::test]
    async fn test_validate_url_blocked_link_local() {
        // 169.254.0.0/16 — covers AWS/GCP/Azure metadata service (169.254.169.254)
        assert!(CollectionService::validate_url("https://169.254.169.254").await.is_err());
        assert!(CollectionService::validate_url("https://169.254.0.1").await.is_err());
        assert!(CollectionService::validate_url("https://[fe80::1]").await.is_err());
    }

    #[tokio::test]
    async fn test_validate_url_invalid_urls() {
        assert!(CollectionService::validate_url("not_a_url").await.is_err());
        assert!(CollectionService::validate_url("https://").await.is_err());
        assert!(CollectionService::validate_url("").await.is_err());
    }
}

