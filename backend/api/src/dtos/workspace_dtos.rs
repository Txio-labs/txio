use crate::model::workspace::WorkspaceType;
use serde::Deserialize;
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct CreateWorkspaceRequest {
    #[validate(length(
        min = 2,
        max = 48,
        message = "Workspace name must be between 2 and 48 characters"
    ))]
    pub name: String,
    pub workspace_type: Option<WorkspaceType>,
}

#[derive(Debug, Deserialize)]
pub struct WorkspaceQuery {
    pub workspace_id: Option<String>,
}
