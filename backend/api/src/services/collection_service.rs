use crate::repositories::{collection_repository::CollectionRepository, request_repository::RequestRepository, user_repository::UserRepository};
use crate::model::{collection::Collection, request::SavedRequest};
use crate::utils::error::AppError;
use crate::services::sui_service::SuiService;
use mongodb::bson::oid::ObjectId;
use serde_json::Value;

#[derive(Clone)]
pub struct CollectionService {
    collection_repo: CollectionRepository,
    request_repo: RequestRepository,
    user_repo: UserRepository,
    sui_service: SuiService,
}

impl CollectionService {
    pub fn new(
        collection_repo: CollectionRepository,
        request_repo: RequestRepository,
        user_repo: UserRepository,
        sui_service: SuiService,
    ) -> Self {
        Self {
            collection_repo,
            request_repo,
            user_repo,
            sui_service,
        }
    }

    // --- Collections ---

    pub async fn create_collection(&self, user_id: ObjectId, name: String, description: Option<String>) -> Result<Collection, AppError> {
        let new_collection = Collection::new(user_id, name, description);
        self.collection_repo.save(&new_collection).await
    }

    pub async fn get_user_collections(&self, user_id: ObjectId) -> Result<Vec<Collection>, AppError> {
        self.collection_repo.find_all_by_user(user_id).await
    }

    pub async fn get_collection(&self, collection_id: ObjectId, user_id: ObjectId) -> Result<Collection, AppError> {
        let collection = self.collection_repo.find_by_id(collection_id).await?;
        if collection.user_id != user_id {
            return Err(AppError::Forbidden("Not authorized to access this collection".into()));
        }
        Ok(collection)
    }

    pub async fn update_collection(&self, collection_id: ObjectId, user_id: ObjectId, name: String, description: Option<String>) -> Result<Collection, AppError> {
        let mut collection = self.get_collection(collection_id, user_id).await?;
        collection.name = name;
        collection.description = description;
        collection.updated_at = chrono::Utc::now();
        self.collection_repo.update(&collection).await
    }

    pub async fn delete_collection(&self, collection_id: ObjectId, user_id: ObjectId) -> Result<(), AppError> {
        let _collection = self.get_collection(collection_id, user_id).await?;
        // Cascade delete requests
        self.request_repo.delete_all_by_collection(collection_id).await?;
        self.collection_repo.delete(collection_id).await?;
        Ok(())
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
        rpc_url: Option<String>
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
            rpc_url
        );
        self.request_repo.save(&new_req).await
    }

    pub async fn get_collection_requests(&self, collection_id: ObjectId, user_id: ObjectId) -> Result<Vec<SavedRequest>, AppError> {
        // Verify ownership
        let _ = self.get_collection(collection_id, user_id).await?;
        self.request_repo.find_all_by_collection(collection_id).await
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
        last_response: Option<Value> // Allow manual update of response (e.g. paste from UI)
    ) -> Result<SavedRequest, AppError> {
        let mut req = self.request_repo.find_by_id(request_id).await?;
        if req.user_id != user_id {
            return Err(AppError::Forbidden("Not authorized".into()));
        }

        if let Some(n) = name { req.name = n; }
        if let Some(m) = method { req.method = m; }
        if let Some(p) = params { req.params = p; }
        
        // Always update options if provided (even separate None vs Some(None) is tricky here, assuming override if Some)
        // Simple merge strategy: if passed, update.
        if network.is_some() { req.network = network; }
        if rpc_url.is_some() { req.rpc_url = rpc_url; }
        if last_response.is_some() { req.last_response = last_response; }

        req.updated_at = chrono::Utc::now();
        self.request_repo.update(&req).await
    }
    
    pub async fn delete_request(&self, request_id: ObjectId, user_id: ObjectId) -> Result<(), AppError> {
        let req = self.request_repo.find_by_id(request_id).await?;
        if req.user_id != user_id {
            return Err(AppError::Forbidden("Not authorized".into()));
        }
        self.request_repo.delete(request_id).await
    }

    pub async fn execute_request(&self, request_id: ObjectId, user_id: ObjectId) -> Result<(SavedRequest, Value), AppError> {
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
                            match self.sui_service.resolve_name_service_address(&final_url, &name).await {
                                Ok(addr) => {
                                    new_string = new_string.replace(&name, &addr);
                                },
                                Err(e) => {
                                    // Synthesis: Return resolution error as JSON-RPC error
                                    let err_val = self.sui_service.error_response(-32002, &format!("SuiNS Resolution Error for '{}': {}", name, e));
                                    
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
        let result = self.sui_service.call_rpc_direct(&final_url, user_id, &req.method, &final_params).await?;

        // 4. Update Request History
        req.last_response = Some(result.clone());
        req.last_executed_at = Some(chrono::Utc::now());
        self.request_repo.update(&req).await?;

        Ok((req, result))
    }
}
