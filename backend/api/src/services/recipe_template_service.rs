use crate::model::recipe_template::RecipeTemplate;
use crate::repositories::recipe_template_repository::RecipeTemplateRepository;
use crate::utils::error::AppError;
use mongodb::bson::oid::ObjectId;
use serde_json::Value;

#[derive(Clone)]
pub struct RecipeTemplateService {
    repo: RecipeTemplateRepository,
}

impl RecipeTemplateService {
    pub fn new(repo: RecipeTemplateRepository) -> Self {
        Self { repo }
    }

    pub async fn create_template(
        &self,
        user_id: ObjectId,
        title: String,
        recipe_type: String,
        description: Option<String>,
        payload: Value,
    ) -> Result<RecipeTemplate, AppError> {
        let template = RecipeTemplate::new(user_id, title, recipe_type, description, payload);
        self.repo.save(&template).await
    }

    pub async fn get_user_templates(
        &self,
        user_id: ObjectId,
    ) -> Result<Vec<RecipeTemplate>, AppError> {
        self.repo.find_all_by_user(user_id).await
    }

    pub async fn delete_template(
        &self,
        template_id: ObjectId,
        user_id: ObjectId,
    ) -> Result<(), AppError> {
        let template = self.repo.find_by_id(template_id).await?;
        if template.user_id != user_id {
            return Err(AppError::Forbidden("Not authorized".into()));
        }
        self.repo.delete(template_id).await
    }
}
