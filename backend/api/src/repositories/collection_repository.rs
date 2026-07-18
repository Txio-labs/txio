use mongodb::{Collection as MongoCollection, Database};
use mongodb::bson::{doc, oid::ObjectId};
use crate::model::collection::Collection;
use crate::utils::error::AppError;
#[derive(Clone)]
pub struct CollectionRepository {
    collection: MongoCollection<Collection>,
}

impl CollectionRepository {
    pub fn new(db: &Database) -> Self {
        let collection = db.collection("collections");
        Self { collection }
    }

    pub async fn save(&self, new_collection: &Collection) -> Result<Collection, AppError> {
        let result = self.collection.insert_one(new_collection, None).await?;
        let mut created = new_collection.clone();
        created.id = result.inserted_id.as_object_id();
        Ok(created)
    }

    pub async fn find_all_by_user(&self, user_id: ObjectId) -> Result<Vec<Collection>, AppError> {
        let filter = doc! { "user_id": user_id };
        let mut cursor = self.collection.find(filter, None).await?;
        
        let mut collections = Vec::new();
        while cursor.advance().await? {
            let c: Collection = cursor.deserialize_current().map_err(|e| AppError::Database(e))?;
            collections.push(c);
        }
        
        Ok(collections)
    }

    pub async fn find_all_by_user_and_workspace(
        &self,
        user_id: ObjectId,
        workspace_id: ObjectId,
    ) -> Result<Vec<Collection>, AppError> {
        let filter = doc! {
            "user_id": user_id,
            "workspace_id": workspace_id,
        };
        let mut cursor = self.collection.find(filter, None).await?;

        let mut collections = Vec::new();
        while cursor.advance().await? {
            let c: Collection = cursor
                .deserialize_current()
                .map_err(AppError::Database)?;
            collections.push(c);
        }

        Ok(collections)
    }

    pub async fn find_by_id(&self, id: ObjectId) -> Result<Collection, AppError> {
        let filter = doc! { "_id": id };
        let result = self.collection.find_one(filter, None).await?;
        result.ok_or_else(|| AppError::NotFound(format!("Collection not found with id: {}", id)))
    }

    pub async fn update(&self, collection: &Collection) -> Result<Collection, AppError> {
        let id = collection.id.ok_or(AppError::InternalError("Cannot update collection without ID".into()))?;
        let filter = doc! { "_id": id };
        
        self.collection.replace_one(filter, collection, None).await?;
        Ok(collection.clone())
    }

    pub async fn delete(&self, id: ObjectId) -> Result<(), AppError> {
        let filter = doc! { "_id": id };
        let result = self.collection.delete_one(filter, None).await?;
        
        if result.deleted_count == 0 {
            return Err(AppError::NotFound(format!("Collection not found for deletion: {}", id)));
        }
        Ok(())
    }

    pub async fn assign_workspace_to_unscoped_user_collections(
        &self,
        user_id: ObjectId,
        workspace_id: ObjectId,
    ) -> Result<(), AppError> {
        self.collection
            .update_many(
                doc! {
                    "user_id": user_id,
                    "$or": [
                        { "workspace_id": { "$exists": false } },
                        { "workspace_id": mongodb::bson::Bson::Null }
                    ]
                },
                doc! {
                    "$set": {
                        "workspace_id": workspace_id
                    }
                },
                None,
            )
            .await?;

        Ok(())
    }
}
