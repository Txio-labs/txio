use crate::model::user::User;
use crate::utils::error::AppError;
use mongodb::bson::doc;
use mongodb::bson::oid::ObjectId;
use mongodb::{Collection, Database};

#[derive(Clone)]
pub struct UserRepository {
    collection: Collection<User>,
}

impl UserRepository {
    pub fn new(db: &Database) -> Self {
        let collection = db.collection("users");
        let repo = Self { collection };
        // Ensure unique index on email (ignore errors for now)
        let index_model = mongodb::IndexModel::builder()
            .keys(mongodb::bson::doc! { "email": 1 })
            .options(mongodb::options::IndexOptions::builder().unique(true).build())
            .build();
        // Fire-and-forget index creation; errors are logged but not fatal
        let _ = repo.collection.create_index(index_model, None);
        repo
    }

    // Optional explicit async method to ensure indices (can be called in startup)
    pub async fn ensure_indices(&self) -> Result<(), AppError> {
        let index_model = mongodb::IndexModel::builder()
            .keys(mongodb::bson::doc! { "email": 1 })
            .options(mongodb::options::IndexOptions::builder().unique(true).build())
            .build();
        self.collection
            .create_index(index_model, None)
            .await
            .map(|_| ())
            .map_err(AppError::Database)
    }

    pub async fn save(&self, user: &User) -> Result<User, AppError> {
        let result = self.collection.insert_one(user, None).await?;

        let mut user_with_id = user.clone();
        if let Some(inserted_id) = result.inserted_id.as_object_id() {
            user_with_id.id = Some(inserted_id);
        }

        Ok(user_with_id)
    }

    pub async fn find_by_email(&self, email: &str) -> Result<User, AppError> {
        let user = self
            .collection
            .find_one(doc! { "email": email }, None)
            .await?
            .ok_or(AppError::NotFound("User not found with email".to_string()))?;

        Ok(user)
    }

    pub async fn find_by_google_sub(&self, google_sub: &str) -> Result<User, AppError> {
        let user = self
            .collection
            .find_one(doc! { "google_sub": google_sub }, None)
            .await?
            .ok_or(AppError::NotFound(
                "User not found with Google subject".to_string(),
            ))?;

        Ok(user)
    }

    pub async fn find_by_id(&self, id: &ObjectId) -> Result<User, AppError> {
        let user = self
            .collection
            .find_one(doc! { "_id": id }, None)
            .await?
            .ok_or(AppError::NotFound("User not found".to_string()))?;

        Ok(user)
    }

    pub async fn delete_by_id(&self, id: &str) -> Result<User, AppError> {
        let object_id = ObjectId::parse_str(id)
            .map_err(|_| AppError::BadRequest("Invalid user ID format".into()))?;

        let user = self
            .collection
            .find_one_and_delete(doc! { "_id": object_id }, None)
            .await?
            .ok_or_else(|| AppError::NotFound("User not found".into()))?;

        Ok(user)
    }

    pub async fn update(&self, user: &User) -> Result<User, AppError> {
        let object_id = user
            .id
            .clone()
            .ok_or_else(|| AppError::BadRequest("User ID is missing".into()))?;

        self.collection
            .replace_one(doc! { "_id": object_id }, user, None)
            .await?;

        Ok(user.clone())
    }

    pub async fn count_documents(&self) -> Result<u64, AppError> {
        let count = self.collection.count_documents(None, None).await?;
        Ok(count)
    }

    /// Lists every registered user's email only — never returns password hashes.
    pub async fn list_all_emails(&self) -> Result<Vec<String>, AppError> {
        let mut cursor = self.collection.find(None, None).await?;
        let mut emails = Vec::new();
        while cursor.advance().await? {
            let user = cursor.deserialize_current()?;
            emails.push(user.email);
        }
        Ok(emails)
    }
}
