use mongodb::{Collection, Database};
use crate::model::otp::OTP;
use crate::utils::error::AppError;
use mongodb::bson::doc;

#[derive(Clone)]
pub struct OTPRepository {
    collection: Collection<OTP>,
}

impl OTPRepository {
    pub fn new(db: &Database) -> Self {
        let collection = db.collection("otps");
        Self { collection }
    }

    pub async fn save(&self, otp: &OTP) -> Result<OTP, AppError> {
        let result = self.collection
            .insert_one(otp, None)
            .await?;
        
        let mut otp_with_id = otp.clone();
        if let Some(inserted_id) = result.inserted_id.as_object_id() {
             otp_with_id.id = Some(inserted_id);
        }
        
        Ok(otp_with_id)
    }

    pub async fn find_by_email(&self, email: &str) -> Result<OTP, AppError> {
        let otp = self
            .collection
            .find_one(doc! { "email": email }, None)
            .await?
            .ok_or(AppError::NotFound("OTP not found for email".to_string()))?;

        Ok(otp)
    }

    pub async fn update_failed_attempts(&self, email: &str, failed_attempts: i32) -> Result<(), AppError> {
        self.collection
            .update_one(
                doc! { "email": email },
                doc! { "$set": { "failed_attempts": failed_attempts } },
                None,
            )
            .await?;
        Ok(())
    }

    pub async fn delete_by_email(&self, email: &str) -> Result<(), AppError> {
        self.collection
            .delete_many(doc! { "email": email }, None)
            .await?;
        Ok(())
    }
}