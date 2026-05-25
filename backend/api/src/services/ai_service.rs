use crate::{
    dtos::ai::{AiChatMessage, AiChatResponse, AiToolCall},
    utils::error::AppError,
};
use dotenvy::{from_path_iter, from_path_override};
use reqwest::{Client, StatusCode};
use serde::Deserialize;
use serde_json::{Value, json};
use std::path::PathBuf;
use std::sync::{
    Arc,
    atomic::{AtomicUsize, Ordering},
};

const GROQ_CHAT_COMPLETIONS_URL: &str = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_GROQ_MODEL: &str = "llama-3.3-70b-versatile";
const SYSTEM_PROMPT: &str = "You are a technical assistant for Sui blockchain development. Be concise. Provide raw code or JSON when asked.";

#[derive(Debug, Clone)]
pub struct AiService {
    client: Client,
    api_keys: Arc<Vec<String>>,
    model: String,
    next_key_index: Arc<AtomicUsize>,
}

#[derive(Debug, Deserialize)]
struct GroqChatResponse {
    choices: Vec<GroqChoice>,
}

#[derive(Debug, Deserialize)]
struct GroqChoice {
    message: GroqMessage,
}

#[derive(Debug, Deserialize)]
struct GroqMessage {
    content: Option<String>,
    tool_calls: Option<Vec<GroqToolCall>>,
}

#[derive(Debug, Deserialize)]
struct GroqToolCall {
    function: GroqFunctionCall,
}

#[derive(Debug, Deserialize)]
struct GroqFunctionCall {
    name: String,
    arguments: String,
}

enum RequestFailure {
    Retryable(String),
    Fatal(String),
}

impl AiService {
    pub fn from_env() -> Self {
        load_ai_env();
        let api_keys = resolve_api_keys();
        let model = resolve_model();

        Self {
            client: Client::new(),
            api_keys: Arc::new(api_keys),
            model,
            next_key_index: Arc::new(AtomicUsize::new(0)),
        }
    }

    pub fn configured_key_count(&self) -> usize {
        if self.api_keys.is_empty() {
            load_ai_env();
            return resolve_api_keys().len();
        }

        self.api_keys.len()
    }

    pub fn model(&self) -> &str {
        &self.model
    }

    pub async fn chat(&self, messages: &[AiChatMessage]) -> Result<AiChatResponse, AppError> {
        let api_keys = self.current_api_keys();

        if api_keys.is_empty() {
            return Err(AppError::BadRequest(
                "AI service is not configured. Set GROQ_API_KEYS or GROQ_API_KEY.".to_string(),
            ));
        }

        let payload = json!({
            "model": self.model,
            "messages": self.build_messages(messages)?,
            "temperature": 0.2,
            "tool_choice": "auto",
            "tools": self.build_tools(),
        });
        let start_index = self.next_key_index.fetch_add(1, Ordering::Relaxed);
        let mut last_retryable_error = None;

        for offset in 0..api_keys.len() {
            let key_index = (start_index + offset) % api_keys.len();
            let api_key = &api_keys[key_index];

            match self.send_chat_request(api_key, &payload).await {
                Ok(response) => {
                    return self.map_chat_response(response);
                }
                Err(RequestFailure::Retryable(error)) => {
                    last_retryable_error = Some(error);
                }
                Err(RequestFailure::Fatal(error)) => {
                    return Err(AppError::ExternalService(error));
                }
            }
        }

        Err(AppError::ExternalService(
            last_retryable_error.unwrap_or_else(|| "Groq request failed.".to_string()),
        ))
    }

    fn build_messages(&self, messages: &[AiChatMessage]) -> Result<Vec<Value>, AppError> {
        let mut built_messages = vec![json!({
            "role": "system",
            "content": SYSTEM_PROMPT,
        })];

        for message in messages {
            let text = message.text.trim();

            if text.is_empty() {
                continue;
            }

            let role = match message.role.trim() {
                "user" => "user",
                "model" | "assistant" => "assistant",
                other => {
                    return Err(AppError::BadRequest(format!(
                        "Unsupported AI role: {other}"
                    )));
                }
            };

            built_messages.push(json!({
                "role": role,
                "content": text,
            }));
        }

        if built_messages.len() == 1 {
            return Err(AppError::BadRequest(
                "AI message history is empty.".to_string(),
            ));
        }

        Ok(built_messages)
    }

    fn current_api_keys(&self) -> Vec<String> {
        if !self.api_keys.is_empty() {
            return self.api_keys.as_ref().clone();
        }

        load_ai_env();
        resolve_api_keys()
    }

    fn build_tools(&self) -> Value {
        json!([
            {
                "type": "function",
                "function": {
                    "name": "create_rpc_request",
                    "description": "Creates a new JSON-RPC request tab.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "method": {
                                "type": "string",
                                "description": "RPC method"
                            },
                            "params": {
                                "type": "array",
                                "description": "JSON-RPC params"
                            },
                            "name": {
                                "type": "string",
                                "description": "Name"
                            }
                        },
                        "required": ["method", "params", "name"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "create_ptb",
                    "description": "Creates a new PTB tab.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "name": {
                                "type": "string",
                                "description": "Name"
                            },
                            "description": {
                                "type": "string",
                                "description": "Description"
                            }
                        },
                        "required": ["name"]
                    }
                }
            }
        ])
    }

    async fn send_chat_request(
        &self,
        api_key: &str,
        payload: &Value,
    ) -> Result<GroqChatResponse, RequestFailure> {
        let response = self
            .client
            .post(GROQ_CHAT_COMPLETIONS_URL)
            .bearer_auth(api_key)
            .json(payload)
            .send()
            .await
            .map_err(|error| RequestFailure::Retryable(format!("Unable to reach Groq: {error}")))?;
        let status = response.status();
        let body = response.text().await.map_err(|error| {
            RequestFailure::Retryable(format!("Unable to read Groq response: {error}"))
        })?;

        if status.is_success() {
            return serde_json::from_str::<GroqChatResponse>(&body).map_err(|error| {
                RequestFailure::Fatal(format!("Groq returned malformed JSON: {error}"))
            });
        }

        let message = parse_groq_error(status, &body);

        if is_retryable_status(status) {
            return Err(RequestFailure::Retryable(message));
        }

        Err(RequestFailure::Fatal(message))
    }

    fn map_chat_response(&self, response: GroqChatResponse) -> Result<AiChatResponse, AppError> {
        let choice =
            response.choices.into_iter().next().ok_or_else(|| {
                AppError::ExternalService("Groq returned no choices.".to_string())
            })?;
        let mut tool_call = None;

        if let Some(call) = choice
            .message
            .tool_calls
            .and_then(|calls| calls.into_iter().next())
        {
            let GroqFunctionCall { name, arguments } = call.function;
            let args = serde_json::from_str::<Value>(&arguments).unwrap_or_else(|_| {
                json!({
                    "raw": arguments
                })
            });

            tool_call = Some(AiToolCall { name, args });
        }

        let text = choice
            .message
            .content
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_string)
            .or_else(|| {
                tool_call
                    .as_ref()
                    .map(|call| format!("Prepared tool call: {}", call.name))
            })
            .unwrap_or_else(|| "No response generated.".to_string());

        Ok(AiChatResponse {
            role: "model".to_string(),
            text,
            tool_call,
        })
    }
}

fn load_ai_env() {
    let [manifest_env, workspace_env] = candidate_env_paths();

    from_path_override(&manifest_env).ok();
    from_path_override(&workspace_env).ok();
}

fn resolve_api_keys() -> Vec<String> {
    let mut api_keys = resolve_env_value("GROQ_API_KEYS")
        .map(|raw| {
            raw.split(',')
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(str::to_string)
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    if api_keys.is_empty() {
        if let Some(api_key) = resolve_env_value("GROQ_API_KEY") {
            api_keys.push(api_key);
        }
    }

    api_keys
}

fn resolve_model() -> String {
    resolve_env_value("GROQ_MODEL").unwrap_or_else(|| DEFAULT_GROQ_MODEL.to_string())
}

fn resolve_env_value(key: &str) -> Option<String> {
    if let Ok(value) = std::env::var(key) {
        let trimmed = value.trim();

        if !trimmed.is_empty() {
            return Some(trimmed.to_string());
        }
    }

    for path in candidate_env_paths() {
        let Ok(iter) = from_path_iter(&path) else {
            continue;
        };

        for entry in iter.flatten() {
            let (entry_key, entry_value) = entry;
            let trimmed = entry_value.trim();

            if entry_key == key && !trimmed.is_empty() {
                return Some(trimmed.to_string());
            }
        }
    }

    None
}

fn candidate_env_paths() -> [PathBuf; 2] {
    [
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(".env"),
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../.env"),
    ]
}

fn is_retryable_status(status: StatusCode) -> bool {
    status == StatusCode::TOO_MANY_REQUESTS
        || status == StatusCode::UNAUTHORIZED
        || status == StatusCode::FORBIDDEN
        || status.is_server_error()
}

fn parse_groq_error(status: StatusCode, body: &str) -> String {
    serde_json::from_str::<Value>(body)
        .ok()
        .and_then(|value| {
            value
                .get("error")
                .and_then(|error| error.get("message"))
                .and_then(Value::as_str)
                .map(str::to_string)
        })
        .or_else(|| {
            let trimmed = body.trim();

            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed.to_string())
            }
        })
        .unwrap_or_else(|| format!("Groq request failed with status {}.", status))
}
