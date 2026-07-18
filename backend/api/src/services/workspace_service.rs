use crate::model::workspace::{Workspace, WorkspaceType};
use crate::repositories::{
    collection_repository::CollectionRepository, workspace_repository::WorkspaceRepository,
};
use crate::utils::error::AppError;
use mongodb::bson::oid::ObjectId;

#[derive(Clone)]
pub struct WorkspaceService {
    workspace_repo: WorkspaceRepository,
    collection_repo: CollectionRepository,
}

impl WorkspaceService {
    pub fn new(workspace_repo: WorkspaceRepository, collection_repo: CollectionRepository) -> Self {
        Self {
            workspace_repo,
            collection_repo,
        }
    }

    pub async fn create_workspace(
        &self,
        user_id: ObjectId,
        name: String,
        workspace_type: WorkspaceType,
    ) -> Result<Workspace, AppError> {
        let existing_workspaces = self.workspace_repo.find_all_by_user(user_id).await?;

        let workspace = self
            .workspace_repo
            .save(&Workspace::new(user_id, name, workspace_type))
            .await?;

        if existing_workspaces.is_empty()
            && let Some(workspace_id) = workspace.id
        {
            self.collection_repo
                .assign_workspace_to_unscoped_user_collections(user_id, workspace_id)
                .await?;
        }

        Ok(workspace)
    }

    pub async fn get_user_workspaces(&self, user_id: ObjectId) -> Result<Vec<Workspace>, AppError> {
        self.workspace_repo.find_all_by_user(user_id).await
    }

    pub async fn get_workspace_for_user(
        &self,
        workspace_id: ObjectId,
        user_id: ObjectId,
    ) -> Result<Workspace, AppError> {
        let workspace = self.workspace_repo.find_by_id(workspace_id).await?;

        if workspace.user_id != user_id {
            return Err(AppError::Forbidden(
                "Not authorized to access this workspace".into(),
            ));
        }

        Ok(workspace)
    }
}
