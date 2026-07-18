use mongodb::{Client, Collection};
use crate::model::rpc::RpcLog;
use crate::utils::error::AppError;

#[derive(Clone)]
pub struct RpcRepository {
    collection: Collection<RpcLog>,
}

impl RpcRepository {
    pub fn new(db: &Client) -> Self {
        let collection = db.database("txio_db").collection("rpc_logs");
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

    pub async fn count_all(&self) -> Result<u64, AppError> {
        let count = self.collection.count_documents(None, None).await?;
        Ok(count)
    }

    pub async fn find_recent(&self, limit: i64) -> Result<Vec<RpcLog>, AppError> {
        use mongodb::bson::doc;
        use mongodb::options::FindOptions;

        let opts = FindOptions::builder()
            .sort(doc! { "_id": -1 })
            .limit(Some(limit))
            .build();

        let mut cursor = self.collection.find(None, Some(opts)).await?;
        let mut logs = Vec::new();
        while cursor.advance().await? {
            let log = cursor.deserialize_current()?;
            logs.push(log);
        }

        Ok(logs)
    }
}
