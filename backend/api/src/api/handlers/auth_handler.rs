// ... existing imports ...

/// Update user password with current password verification
pub async fn update_user_password(
    claims: Claims,
    State(state): State<AppState>,
    Json(payload): Json<UpdatePasswordRequest>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    // 1. Get the user from the database
    let user = state
        .db
        .users()
        .find_by_id(&claims.sub)
        .await
        .map_err(|_| AppError::NotFound("User not found".to_string()))?;

    // 2. Verify the current password
    let is_valid = verify_password(&payload.current_password, &user.password_hash)
        .map_err(|_| AppError::InternalServerError)?;
    
    if !is_valid {
        return Err(AppError::Unauthorized("Current password is incorrect".to_string()));
    }

    // 3. Hash the new password
    let new_password_hash = hash_password(&payload.new_password)
        .map_err(|_| AppError::InternalServerError)?;

    // 4. Update the password in the database
    state
        .db
        .users()
        .update_password(&user.id, &new_password_hash)
        .await
        .map_err(|_| AppError::InternalServerError)?;

    // 5. Return success response
    Ok(Json(ApiResponse {
        success: true,
        message: "Password updated successfully".to_string(),
        data: None,
    }))
}

// Request/Response DTOs
#[derive(Debug, Deserialize, Validate)]
pub struct UpdatePasswordRequest {
    #[validate(length(min = 1, message = "Current password is required"))]
    pub current_password: String,
    #[validate(length(min = 8, message = "New password must be at least 8 characters"))]
    pub new_password: String,
    #[validate(length(min = 1, message = "Confirm password is required"))]
    pub confirm_password: String,
}

// ... rest of the file ...
