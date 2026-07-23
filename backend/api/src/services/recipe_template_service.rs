use crate::dtos::recipe_template_dtos::RecipeTemplateResponse;
use crate::model::recipe_template::RecipeTemplate;
use crate::repositories::recipe_template_repository::RecipeTemplateRepository;
use crate::utils::error::AppError;
use mongodb::bson::oid::ObjectId;

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
        template_type: String,
    ) -> Result<RecipeTemplateResponse, AppError> {
        let template = RecipeTemplate::new(user_id, title, template_type);
        let saved = self.repo.save(&template).await?;
        Ok(Self::to_response(saved))
    }

    pub async fn list_templates(
        &self,
        user_id: ObjectId,
    ) -> Result<Vec<RecipeTemplateResponse>, AppError> {
        let templates = self.repo.find_all_by_user(user_id).await?;
        Ok(templates.into_iter().map(Self::to_response).collect())
    }

    pub async fn delete_template(
        &self,
        template_id: ObjectId,
        user_id: ObjectId,
    ) -> Result<(), AppError> {
        self.repo.delete(template_id, user_id).await
    }

    fn to_response(template: RecipeTemplate) -> RecipeTemplateResponse {
        RecipeTemplateResponse {
            id: template.id.map(|id| id.to_string()).unwrap_or_default(),
            title: template.title,
            template_type: template.template_type,
            created_at: template.created_at.to_rfc3339(),
        }
    }
}
