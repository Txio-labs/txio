use crate::model::recipe_template::RecipeTemplate;
use crate::utils::error::AppError;
use mongodb::bson::{doc, oid::ObjectId};
use mongodb::{Collection, Database};

#[derive(Clone)]
pub struct RecipeTemplateRepository {
    collection: Collection<RecipeTemplate>,
}

impl RecipeTemplateRepository {
    pub fn new(db: &Database) -> Self {
        let collection = db.collection("recipe_templates");
        Self { collection }
    }

    pub async fn save(&self, template: &RecipeTemplate) -> Result<RecipeTemplate, AppError> {
        let result = self.collection.insert_one(template, None).await?;
        let mut created = template.clone();
        created.id = result.inserted_id.as_object_id();
        Ok(created)
    }

    pub async fn find_all_by_user(&self, user_id: ObjectId) -> Result<Vec<RecipeTemplate>, AppError> {
        let filter = doc! { "user_id": user_id };
        let mut cursor = self.collection.find(filter, None).await?;

        let mut templates = Vec::new();
        while cursor.advance().await? {
            let t: RecipeTemplate = cursor.deserialize_current().map_err(AppError::Database)?;
            templates.push(t);
        }

        Ok(templates)
    }

    /// Deletes a template that belongs to `user_id`. Returns `NotFound` if no
    /// matching document exists (either it never existed or belongs to
    /// someone else — same error either way to avoid enumeration).
    pub async fn delete(&self, id: ObjectId, user_id: ObjectId) -> Result<(), AppError> {
        let filter = doc! { "_id": id, "user_id": user_id };
        let result = self.collection.delete_one(filter, None).await?;
        if result.deleted_count == 0 {
            return Err(AppError::NotFound(format!(
                "Template not found for deletion: {id}"
            )));
        }
        Ok(())
    }
}
