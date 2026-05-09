use mongodb::{Client, Collection};
use crate::model::rpc::RpcLog;
use crate::utils::error::AppError;

#[derive(Clone)]
pub struct RpcRepository {
    collection: Collection<RpcLog>,
}

impl RpcRepository {
    pub fn new(db: &Client) -> Self {
        let collection = db.database("flow_db").collection("rpc_logs");
        Self { collection }
    }

    pub async fn save(&self, log: &RpcLog) -> Result<(), AppError> {
        self.collection.insert_one(log, None).await?;
        Ok(())
    }

    pub async fn find_by_user_id(&self, user_id: mongodb::bson::oid::ObjectId) -> Result<Vec<RpcLog>, AppError> {
        let filter = mongodb::bson::doc! { "user_id": user_id };
        let mut cursor = self.collection.find(filter, None).await?;
        
        let mut logs = Vec::new();
        while cursor.advance().await? {
            let log = cursor.deserialize_current()?;
            logs.push(log);
        }
        
        Ok(logs)
    }
}
