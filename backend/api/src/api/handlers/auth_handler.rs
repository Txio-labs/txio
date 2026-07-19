use crate::dtos::{
    admin_dtos::RpcLogRequest,
    request::{
        LoginRequest, OTPRequest, RegisterUserRequest, ResetPasswordWithOTPRequest,
        SwitchNetworkRequest, UpdateEmailRequest, UpdateNotificationPreferencesRequest,
        UpdatePasswordRequest, VerifyOTPRequest,
    },
    response::AuthResponse,
};
use crate::services::auth_service::AuthService;
use crate::services::otp_service::constant_time_eq;
use crate::utils::error::AppError;
use axum::{
    Json,
    extract::{Path, State},
    http::header,
    response::IntoResponse,
};
use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
use hmac::{Hmac, Mac};
use serde_json::{Value, json};
use sha2::Sha256;
use std::net::SocketAddr;

type HmacSha256 = Hmac<Sha256>;

// ── Device-label helper ──────────────────────────────────────────────────────

/// Parse a raw User-Agent header into a short human-readable label such as
/// "Chrome on macOS" or "Firefox on Windows".
fn parse_device_label(ua: &str) -> String {
    let browser = if ua.contains("Edg/") || ua.contains("Edge/") {
        "Edge"
    } else if ua.contains("OPR/") || ua.contains("Opera/") {
        "Opera"
    } else if ua.contains("Firefox/") {
        "Firefox"
    } else if ua.contains("Chrome/") {
        "Chrome"
    } else if ua.contains("Safari/") {
        "Safari"
    } else {
        "Unknown Browser"
    };

    let os = if ua.contains("Windows") {
        "Windows"
    } else if ua.contains("iPhone") || ua.contains("iPad") {
        "iOS"
    } else if ua.contains("Android") {
        "Android"
    } else if ua.contains("Macintosh") || ua.contains("Mac OS X") {
        "macOS"
    } else if ua.contains("Linux") {
        "Linux"
    } else {
        "Unknown OS"
    };

    format!("{} on {}", browser, os)
}

/// Extract the best available client IP from headers or the TCP peer address.
fn extract_ip(headers: &axum::http::HeaderMap, addr: Option<SocketAddr>) -> String {
    // Prefer X-Forwarded-For (set by reverse proxies like nginx / Cloudflare).
    // Only trust the leftmost entry — it is the original client address.
    if let Some(xff) = headers
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
    {
        let first = xff.split(',').next().unwrap_or("").trim();
        if !first.is_empty() {
            return first.to_string();
        }
    }

    // Fall back to direct TCP peer.
    addr.map(|a| a.ip().to_string())
        .unwrap_or_else(|| "unknown".to_string())
}

// ── Auth handlers ────────────────────────────────────────────────────────────

pub async fn register(
    State(service): State<AuthService>,
    axum::extract::ConnectInfo(addr): axum::extract::ConnectInfo<SocketAddr>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<RegisterUserRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    use validator::Validate;
    payload
        .validate()
        .map_err(|e| AppError::ValidationError(e.to_string()))?;

    let auth = service.register_user(payload).await?;

    // Create a session record for this new login.
    if let Ok(claims) = service.verify_token(&auth.token) {
        let ua = headers
            .get(header::USER_AGENT)
            .and_then(|v| v.to_str().ok())
            .unwrap_or("Unknown");
        let device_label = parse_device_label(ua);
        let ip = extract_ip(&headers, Some(addr));
        let jti = claims.jti.as_deref().unwrap_or(&claims.sub);
        let _ = service
            .create_session(&claims.sub, jti, &device_label, &ip)
            .await;
    }

    Ok(Json(auth))
}

pub async fn login(
    State(service): State<AuthService>,
    axum::extract::ConnectInfo(addr): axum::extract::ConnectInfo<SocketAddr>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    use validator::Validate;
    payload
        .validate()
        .map_err(|e| AppError::ValidationError(e.to_string()))?;

    let auth = service.login_user(payload).await?;

    // Create a session record after successful authentication.
    if let Ok(claims) = service.verify_token(&auth.token) {
        let ua = headers
            .get(header::USER_AGENT)
            .and_then(|v| v.to_str().ok())
            .unwrap_or("Unknown");
        let device_label = parse_device_label(ua);
        let ip = extract_ip(&headers, Some(addr));
        let jti = claims.jti.as_deref().unwrap_or(&claims.sub);
        let _ = service
            .create_session(&claims.sub, jti, &device_label, &ip)
            .await;
    }

    Ok(Json(auth))
}

pub async fn request_otp(
    State(service): State<AuthService>,
    Json(payload): Json<OTPRequest>,
) -> Result<Json<Value>, AppError> {
    use validator::Validate;
    payload
        .validate()
        .map_err(|e| AppError::ValidationError(e.to_string()))?;

    service.request_otp(payload.email).await?;

    Ok(Json(json!({ "message": "OTP sent successfully" })))
}

pub async fn verify_otp(
    State(service): State<AuthService>,
    Json(payload): Json<VerifyOTPRequest>,
) -> Result<Json<Value>, AppError> {
    use validator::Validate;
    payload
        .validate()
        .map_err(|e| AppError::ValidationError(e.to_string()))?;

    let is_valid = service.verify_otp(payload.email, payload.otp).await?;

    if !is_valid {
        return Err(AppError::BadRequest("Invalid or expired OTP".into()));
    }

    Ok(Json(json!({ "message": "OTP verified successfully" })))
}

pub async fn profile(
    State(service): State<AuthService>,
    claims: crate::utils::auth_jwt::Claims,
) -> Result<Json<crate::dtos::response::UserResponse>, AppError> {
    let user = service.get_user_profile_by_email(&claims.email).await?;
    Ok(Json(user))
}

pub async fn logout() -> Result<Json<Value>, AppError> {
    Ok(Json(json!({ "message": "Logged out successfully" })))
}

pub async fn get_user_profile(
    State(service): State<AuthService>,
    claims: crate::utils::auth_jwt::Claims,
) -> Result<Json<Value>, AppError> {
    let user = service.get_user_profile_by_email(&claims.email).await?;
    Ok(Json(json!({ "user": user })))
}

pub async fn update_user_email(
    State(service): State<AuthService>,
    claims: crate::utils::auth_jwt::Claims,
    Json(payload): Json<UpdateEmailRequest>,
) -> Result<Json<Value>, AppError> {
    use validator::Validate;
    payload
        .validate()
        .map_err(|e| AppError::ValidationError(e.to_string()))?;

    let user = service
        .update_user_email_by_email(&claims.email, &payload.new_email)
        .await?;

    Ok(Json(json!({ "user": user })))
}

pub async fn update_notification_preferences(
    State(service): State<AuthService>,
    claims: crate::utils::auth_jwt::Claims,
    Json(payload): Json<UpdateNotificationPreferencesRequest>,
) -> Result<Json<Value>, AppError> {
    let user = service
        .update_notification_preferences_by_email(&claims.email, payload.notification_preferences)
        .await?;

    Ok(Json(json!({ "user": user })))
}

pub async fn update_user_password(
    State(service): State<AuthService>,
    claims: crate::utils::auth_jwt::Claims,
    Json(payload): Json<UpdatePasswordRequest>,
) -> Result<Json<Value>, AppError> {
    use validator::Validate;
    payload
        .validate()
        .map_err(|e| AppError::ValidationError(e.to_string()))?;

    let user = service
        .update_user_password_by_email(
            &claims.email,
            &payload.current_password,
            &payload.new_password,
        )
        .await?;

    Ok(Json(json!({ "user": user })))
}

pub async fn delete_user(
    State(service): State<AuthService>,
    claims: crate::utils::auth_jwt::Claims,
) -> Result<Json<Value>, AppError> {
    let user = service.delete_user_by_email(&claims.email).await?;
    Ok(Json(json!({ "user": user })))
}

pub async fn forgot_password(
    State(service): State<AuthService>,
    Json(payload): Json<OTPRequest>,
) -> Result<Json<Value>, AppError> {
    use validator::Validate;
    payload
        .validate()
        .map_err(|e| AppError::ValidationError(e.to_string()))?;

    service.request_otp(payload.email).await?;

    Ok(Json(
        json!({ "message": "OTP for password reset sent successfully" }),
    ))
}

pub async fn reset_password_with_otp(
    State(service): State<AuthService>,
    Json(payload): Json<ResetPasswordWithOTPRequest>,
) -> Result<Json<Value>, AppError> {
    use validator::Validate;
    payload
        .validate()
        .map_err(|e| AppError::ValidationError(e.to_string()))?;

    service
        .reset_password_with_otp(&payload.email, &payload.otp, &payload.new_password)
        .await?;

    Ok(Json(json!({ "message": "Password reset successfully" })))
}

pub async fn log_rpc_call(
    State(service): State<AuthService>,
    claims: crate::utils::auth_jwt::Claims,
    Json(payload): Json<RpcLogRequest>,
) -> Result<Json<Value>, AppError> {
    use mongodb::bson::oid::ObjectId;
    use std::str::FromStr;
    use validator::Validate;

    payload
        .validate()
        .map_err(|e| AppError::ValidationError(e.to_string()))?;

    let user_id = ObjectId::from_str(&claims.sub)
        .map_err(|_| AppError::InternalError("Invalid user ID in token".into()))?;

    service.log_rpc_call(user_id, payload).await?;

    Ok(Json(json!({ "message": "RPC call logged" })))
}

pub async fn switch_network(
    State(service): State<AuthService>,
    claims: crate::utils::auth_jwt::Claims,
    Json(payload): Json<SwitchNetworkRequest>,
) -> Result<Json<Value>, AppError> {
    use mongodb::bson::oid::ObjectId;
    use std::str::FromStr;

    let user_id = ObjectId::from_str(&claims.sub)
        .map_err(|_| AppError::InternalError("Invalid user ID in token".into()))?;

    let user = service
        .update_user_network(user_id, payload.network)
        .await?;

    Ok(Json(json!({
        "message": "Network switched successfully",
        "user": user
    })))
}

// ── Session handlers ─────────────────────────────────────────────────────────

/// `GET /auth/sessions` — list all active sessions for the authenticated user.
/// The session matching the current request's JWT is flagged `is_current: true`.
pub async fn list_sessions(
    State(service): State<AuthService>,
    claims: crate::utils::auth_jwt::Claims,
) -> Result<Json<Value>, AppError> {
    let current_jti = claims.jti.as_deref();
    let sessions = service.list_sessions(&claims.sub, current_jti).await?;
    Ok(Json(json!({ "sessions": sessions })))
}

/// `DELETE /auth/sessions/:session_id` — revoke a specific session.
/// Users can only revoke their own sessions.
pub async fn revoke_session(
    State(service): State<AuthService>,
    claims: crate::utils::auth_jwt::Claims,
    Path(session_id): Path<String>,
) -> Result<Json<Value>, AppError> {
    service.revoke_session(&claims.sub, &session_id).await?;
    Ok(Json(json!({ "message": "Session revoked" })))
}

// ── OAuth helpers ─────────────────────────────────────────────────────────────

fn oauth_signing_key() -> Result<Vec<u8>, AppError> {
    let secret = std::env::var("JWT_SECRET")
        .map_err(|_| AppError::InternalError("JWT_SECRET not set".into()))?;
    Ok(secret.into_bytes())
}

fn generate_oauth_state() -> Result<String, AppError> {
    let nonce: Vec<u8> = (0..32).map(|_| rand::random::<u8>()).collect();
    let key = oauth_signing_key()?;
    let mut mac = HmacSha256::new_from_slice(&key)
        .map_err(|_| AppError::InternalError("HMAC key error".into()))?;
    mac.update(&nonce);
    let signature = mac.finalize().into_bytes();
    let mut payload = nonce;
    payload.extend_from_slice(&signature);
    Ok(URL_SAFE_NO_PAD.encode(&payload))
}

fn verify_oauth_state(state: &str) -> Result<(), AppError> {
    let decoded = URL_SAFE_NO_PAD
        .decode(state)
        .map_err(|_| AppError::BadRequest("Invalid OAuth state parameter".into()))?;
    if decoded.len() < 32 + 32 {
        return Err(AppError::BadRequest("Invalid OAuth state parameter".into()));
    }
    let (nonce, signature) = decoded.split_at(decoded.len() - 32);
    let key = oauth_signing_key()?;
    let mut mac = HmacSha256::new_from_slice(&key)
        .map_err(|_| AppError::InternalError("HMAC key error".into()))?;
    mac.update(nonce);
    mac.verify_slice(signature)
        .map_err(|_| AppError::BadRequest("Invalid or expired OAuth state parameter".into()))
}

fn set_cookie(headers: &mut axum::http::HeaderMap, name: &str, value: &str) {
    let cookie = format!(
        "{}={}; Path=/; Max-Age=600; SameSite=Lax; HttpOnly",
        name, value
    );
    headers.append(header::SET_COOKIE, cookie.parse().unwrap());
}

fn get_cookie(headers: &axum::http::HeaderMap, name: &str) -> Option<String> {
    let cookie_header = headers.get(header::COOKIE)?.to_str().ok()?;
    for part in cookie_header.split(';') {
        let mut kv = part.trim().splitn(2, '=');
        if let (Some(k), Some(v)) = (kv.next(), kv.next()) {
            if k.trim() == name {
                return Some(v.to_string());
            }
        }
    }
    None
}

#[derive(serde::Deserialize)]
pub struct OAuthCallbackQuery {
    pub code: String,
    pub state: Option<String>,
}

pub async fn google_login() -> Result<axum::response::Response, AppError> {
    let client_id = std::env::var("GOOGLE_CLIENT_ID").unwrap_or_default();
    if client_id.trim().is_empty() {
        return Err(AppError::BadRequest(
            "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.".into(),
        ));
    }
    let redirect_uri = std::env::var("GOOGLE_REDIRECT_URL")
        .unwrap_or_else(|_| "http://localhost:8000/api/v1/auth/google/callback".to_string());

    let state = generate_oauth_state()?;

    let mut headers = axum::http::HeaderMap::new();
    set_cookie(&mut headers, "oauth_state", &state);

    let url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?client_id={}&redirect_uri={}&response_type=code&scope=email+profile&state={}",
        urlencoding::encode(&client_id),
        urlencoding::encode(&redirect_uri),
        urlencoding::encode(&state),
    );

    let mut response = axum::response::Redirect::temporary(&url).into_response();
    response.headers_mut().extend(headers);
    Ok(response)
}

pub async fn google_callback(
    State(service): State<AuthService>,
    axum::extract::Query(query): axum::extract::Query<OAuthCallbackQuery>,
    headers: axum::http::HeaderMap,
) -> Result<axum::response::Redirect, AppError> {
    let cookie_state = get_cookie(&headers, "oauth_state")
        .ok_or(AppError::BadRequest("Missing OAuth state cookie".into()))?;

    let query_state = query
        .state
        .as_deref()
        .ok_or(AppError::BadRequest("Missing OAuth state parameter".into()))?;

    if !constant_time_eq(&cookie_state, query_state) {
        return Err(AppError::BadRequest(
            "OAuth state mismatch — possible CSRF attack".into(),
        ));
    }

    verify_oauth_state(query_state)?;

    let client_id = std::env::var("GOOGLE_CLIENT_ID").unwrap_or_default();
    let client_secret = std::env::var("GOOGLE_CLIENT_SECRET").unwrap_or_default();
    if client_id.trim().is_empty() || client_secret.trim().is_empty() {
        return Err(AppError::BadRequest(
            "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.".into(),
        ));
    }
    let redirect_uri = std::env::var("GOOGLE_REDIRECT_URL")
        .unwrap_or_else(|_| "http://localhost:8000/api/v1/auth/google/callback".to_string());
    let frontend_url =
        std::env::var("FRONTEND_URL").unwrap_or_else(|_| "http://localhost:3000".to_string());

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());
    let token_res = client
        .post("https://oauth2.googleapis.com/token")
        .form(&[
            ("client_id", client_id.as_str()),
            ("client_secret", client_secret.as_str()),
            ("code", query.code.as_str()),
            ("grant_type", "authorization_code"),
            ("redirect_uri", redirect_uri.as_str()),
        ])
        .send()
        .await
        .map_err(|_| AppError::InternalError("Failed to get Google token".into()))?;

    let token_data: Value = token_res
        .json()
        .await
        .map_err(|_| AppError::InternalError("Failed to parse Google token".into()))?;
    let access_token = token_data["access_token"]
        .as_str()
        .ok_or(AppError::InternalError("No access token".into()))?;

    let user_res = client
        .get("https://www.googleapis.com/oauth2/v2/userinfo")
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|_| AppError::InternalError("Failed to get Google user info".into()))?;

    let user_data: Value = user_res
        .json()
        .await
        .map_err(|_| AppError::InternalError("Failed to parse Google user info".into()))?;

    let verified_email = user_data["verified_email"].as_bool().unwrap_or(false);
    if !verified_email {
        return Err(AppError::Unauthorized(
            "Google email address is not verified".into(),
        ));
    }

    let google_sub = user_data["id"].as_str().ok_or(AppError::InternalError(
        "No Google subject in profile".into(),
    ))?;
    let email = user_data["email"]
        .as_str()
        .ok_or(AppError::InternalError("No email in Google profile".into()))?;

    let auth_res = service
        .oauth_login_or_register(google_sub.to_string(), email.to_string())
        .await?;

    // Create a session for the OAuth login.
    if let Ok(claims) = service.verify_token(&auth_res.token) {
        let ua = headers
            .get(header::USER_AGENT)
            .and_then(|v| v.to_str().ok())
            .unwrap_or("Unknown");
        let device_label = parse_device_label(ua);
        // No ConnectInfo available here (redirect flow); use X-Forwarded-For only.
        let ip = headers
            .get("x-forwarded-for")
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.split(',').next())
            .map(|s| s.trim().to_string())
            .unwrap_or_else(|| "unknown".to_string());
        let jti = claims.jti.as_deref().unwrap_or(&claims.sub);
        let _ = service
            .create_session(&claims.sub, jti, &device_label, &ip)
            .await;
    }

    let redirect_to = format!(
        "{}/?token={}",
        frontend_url.trim_end_matches('/'),
        auth_res.token
    );

    Ok(axum::response::Redirect::temporary(&redirect_to))
}

fn constant_time_eq(a: &str, b: &str) -> bool {
    if a.len() != b.len() {
        return false;
    }
    a.bytes().zip(b.bytes()).fold(0u8, |acc, (x, y)| acc | (x ^ y)) == 0
}
