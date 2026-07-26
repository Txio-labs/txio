use crate::model::session::Session;
use crate::utils::error::AppError;
use mongodb::bson::doc;
use mongodb::bson::oid::ObjectId;
use mongodb::{Collection, Database};

#[derive(Clone)]
pub struct SessionRepository {
    collection: Collection<Session>,
}

impl SessionRepository {
    pub fn new(db: &Database) -> Self {
        Self {
            collection: db.collection("sessions"),
        }
    }

    pub async fn save(&self, session: &Session) -> Result<Session, AppError> {
        let result = self.collection.insert_one(session, None).await?;
        let mut session_with_id = session.clone();
        if let Some(inserted_id) = result.inserted_id.as_object_id() {
            session_with_id.id = Some(inserted_id);
        }
        Ok(session_with_id)
    }

    pub async fn find_by_user_id(&self, user_id: &ObjectId) -> Result<Vec<Session>, AppError> {
        let mut cursor = self
            .collection
            .find(doc! { "user_id": user_id }, None)
            .await?;
        let mut sessions = Vec::new();
        while cursor.advance().await? {
            sessions.push(cursor.deserialize_current()?);
        }
        Ok(sessions)
    }

    /// Delete a specific session that belongs to the given user.
    /// Returns NotFound if no matching document exists (either wrong ID or
    /// the session belongs to a different user — same error to avoid enumeration).
    pub async fn delete_by_id_and_user(
        &self,
        session_id: &ObjectId,
        user_id: &ObjectId,
    ) -> Result<(), AppError> {
        let result = self
            .collection
            .delete_one(doc! { "_id": session_id, "user_id": user_id }, None)
            .await?;

        if result.deleted_count == 0 {
            return Err(AppError::NotFound("Session not found".into()));
        }
        Ok(())
    }

    /// Remove all sessions for a user — called when the account is deleted.
    pub async fn delete_all_by_user_id(&self, user_id: &ObjectId) -> Result<(), AppError> {
        self.collection
            .delete_many(doc! { "user_id": user_id }, None)
            .await?;
        Ok(())
    }
}
