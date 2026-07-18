use crate::model::workspace::Workspace;
use crate::utils::error::AppError;
use mongodb::bson::{doc, oid::ObjectId};
use mongodb::{Collection as MongoCollection, Database};

#[derive(Clone)]
pub struct WorkspaceRepository {
    collection: MongoCollection<Workspace>,
}

impl WorkspaceRepository {
    pub fn new(db: &Database) -> Self {
        let collection = db.collection("workspaces");
        Self { collection }
    }

    pub async fn save(
        &self,
        new_workspace: &Workspace,
    ) -> Result<Workspace, AppError> {
        let result = self.collection.insert_one(new_workspace, None).await?;
        let mut created = new_workspace.clone();
        created.id = result.inserted_id.as_object_id();
        Ok(created)
    }

    pub async fn find_all_by_user(
        &self,
        user_id: ObjectId,
    ) -> Result<Vec<Workspace>, AppError> {
        let mut cursor = self
            .collection
            .find(doc! { "user_id": user_id }, None)
            .await?;

        let mut workspaces = Vec::new();
        while cursor.advance().await? {
            let workspace: Workspace = cursor
                .deserialize_current()
                .map_err(AppError::Database)?;
            workspaces.push(workspace);
        }

        workspaces.sort_by(|left, right| left.created_at.cmp(&right.created_at));

        Ok(workspaces)
    }

    pub async fn find_by_id(
        &self,
        id: ObjectId,
    ) -> Result<Workspace, AppError> {
        let result = self
            .collection
            .find_one(doc! { "_id": id }, None)
            .await?;

        result.ok_or_else(|| {
            AppError::NotFound(format!(
                "Workspace not found with id: {}",
                id
            ))
        })
    }
}
