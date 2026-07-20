use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    process::Stdio,
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::{
    io::AsyncReadExt,
    process::Command,
    sync::{RwLock, oneshot},
    task::JoinHandle,
    time::sleep,
};
use uuid::Uuid;

const COMMAND_TIMEOUT: Duration = Duration::from_secs(60);

/// How long a completed execution record is retained before eviction.
/// Running records are never evicted; only terminated ones (Success, Error,
/// Cancelled, TimedOut) are eligible after this interval.
const EXECUTION_TTL: Duration = Duration::from_secs(5 * 60);

/// Maximum number of records kept in the map at any time (running + completed).
/// When this is exceeded the oldest completed records are evicted first so that
/// sustained use cannot grow memory without bound.
const MAX_EXECUTIONS: usize = 500;

/// Maximum bytes retained per output field (output, stdout, stderr) after a
/// command finishes. Captured output beyond this limit is truncated with a
/// marker, keeping the last MAX_OUTPUT_BYTES of content so the tail (most
/// useful for diagnosis) is always visible.
const MAX_OUTPUT_BYTES: usize = 256 * 1024;

/// How often the background eviction loop wakes up to prune stale records.
const EVICTION_INTERVAL: Duration = Duration::from_secs(60);

#[derive(Debug, Clone)]
pub struct TerminalService {
    executions: Arc<RwLock<HashMap<String, CommandExecutionRecord>>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum CommandExecutionState {
    Running,
    Success,
    Error,
    Cancelled,
    TimedOut,
}

impl CommandExecutionState {
    fn is_terminal(&self) -> bool {
        !matches!(self, CommandExecutionState::Running)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandExecutionResponse {
    pub execution_id: String,
    pub command: String,
    pub state: CommandExecutionState,
    pub output: Option<String>,
    pub stdout: Option<String>,
    pub stderr: Option<String>,
    pub exit_code: Option<i32>,
    pub duration_ms: Option<u64>,
}

#[derive(Debug)]
struct CommandExecutionRecord {
    execution_id: String,
    command: String,
    state: CommandExecutionState,
    output: Option<String>,
    stdout: Option<String>,
    stderr: Option<String>,
    exit_code: Option<i32>,
    duration_ms: Option<u64>,
    cancel_tx: Option<oneshot::Sender<()>>,
    /// Wall-clock instant when this record transitioned to a terminal state.
    /// `None` while the execution is still running.
    completed_at: Option<Instant>,
}

#[derive(Debug)]
struct FinalizedExecution {
    state: CommandExecutionState,
    output: Option<String>,
    stdout: Option<String>,
    stderr: Option<String>,
    exit_code: Option<i32>,
}

enum WaitOutcome {
    Finished(std::io::Result<std::process::ExitStatus>),
    Cancelled,
    TimedOut,
}

impl CommandExecutionRecord {
    fn running(execution_id: String, command: String, cancel_tx: oneshot::Sender<()>) -> Self {
        Self {
            execution_id,
            command,
            state: CommandExecutionState::Running,
            output: None,
            stdout: None,
            stderr: None,
            exit_code: None,
            duration_ms: None,
            cancel_tx: Some(cancel_tx),
            completed_at: None,
        }
    }

    fn snapshot(&self) -> CommandExecutionResponse {
        CommandExecutionResponse {
            execution_id: self.execution_id.clone(),
            command: self.command.clone(),
            state: self.state.clone(),
            output: self.output.clone(),
            stdout: self.stdout.clone(),
            stderr: self.stderr.clone(),
            exit_code: self.exit_code,
            duration_ms: self.duration_ms,
        }
    }
}

/// Truncate `s` to at most `max_bytes`, keeping the **tail** and prepending a
/// truncation notice so callers know output was clipped.
fn cap_output(s: Option<String>, max_bytes: usize) -> Option<String> {
    s.map(|text| {
        if text.len() <= max_bytes {
            return text;
        }
        // Keep the tail — it is the most useful part for post-mortem diagnosis.
        let tail_start = text.len() - max_bytes;
        // Advance to the next valid UTF-8 boundary.
        let tail_start = text
            .char_indices()
            .map(|(i, _)| i)
            .filter(|&i| i >= tail_start)
            .next()
            .unwrap_or(text.len());
        format!(
            "[... output truncated — showing last {} bytes ...]\n{}",
            max_bytes,
            &text[tail_start..]
        )
    })
}

impl TerminalService {
    pub fn new() -> Self {
        let executions = Arc::new(RwLock::new(HashMap::<String, CommandExecutionRecord>::new()));

        // Spawn a background task that periodically evicts stale records so the
        // in-memory map does not grow without bound during sustained use.
        let executions_bg = Arc::clone(&executions);
        tokio::spawn(async move {
            loop {
                sleep(EVICTION_INTERVAL).await;

                let mut map = executions_bg.write().await;

                // Phase 1: remove completed records older than TTL.
                map.retain(|_, record| {
                    if let Some(completed_at) = record.completed_at {
                        completed_at.elapsed() < EXECUTION_TTL
                    } else {
                        true // keep running records
                    }
                });

                // Phase 2: if still over the cap, evict the oldest completed
                // records (by completed_at) until we are back under the limit.
                if map.len() > MAX_EXECUTIONS {
                    let mut completed_ids: Vec<(Instant, String)> = map
                        .values()
                        .filter(|r| r.completed_at.is_some())
                        .map(|r| (r.completed_at.unwrap(), r.execution_id.clone()))
                        .collect();

                    // Sort oldest-first.
                    completed_ids.sort_by_key(|(t, _)| *t);

                    let to_remove = map.len().saturating_sub(MAX_EXECUTIONS);
                    for (_, id) in completed_ids.iter().take(to_remove) {
                        map.remove(id);
                    }
                }
            }
        });

        Self { executions }
    }

    pub async fn execute(&self, command_str: &str) -> Result<CommandExecutionResponse, String> {
        let trimmed_command = command_str.trim();

        if trimmed_command.is_empty() {
            return Err("Empty command".to_string());
        }

        let execution_id = Uuid::new_v4().to_string();
        let command = trimmed_command.to_string();
        let (cancel_tx, cancel_rx) = oneshot::channel();
        let record =
            CommandExecutionRecord::running(execution_id.clone(), command.clone(), cancel_tx);

        {
            let mut executions = self.executions.write().await;
            executions.insert(execution_id.clone(), record);
        }

        self.spawn_execution_task(execution_id.clone(), command, cancel_rx);

        self.get_execution(&execution_id)
            .await
            .ok_or_else(|| "Execution was not registered.".to_string())
    }

    pub async fn get_execution(&self, execution_id: &str) -> Option<CommandExecutionResponse> {
        let executions = self.executions.read().await;

        executions
            .get(execution_id)
            .map(CommandExecutionRecord::snapshot)
    }

    pub async fn cancel_execution(
        &self,
        execution_id: &str,
    ) -> Result<CommandExecutionResponse, String> {
        let mut executions = self.executions.write().await;
        let Some(record) = executions.get_mut(execution_id) else {
            return Err("Execution not found.".to_string());
        };

        if record.state != CommandExecutionState::Running {
            return Ok(record.snapshot());
        }

        if let Some(cancel_tx) = record.cancel_tx.take() {
            let _ = cancel_tx.send(());
        }

        Ok(record.snapshot())
    }

    fn spawn_execution_task(
        &self,
        execution_id: String,
        command_str: String,
        cancel_rx: oneshot::Receiver<()>,
    ) {
        let service = self.clone();

        tokio::spawn(async move {
            let started_at = Instant::now();
            let finalized = service.run_command(&command_str, cancel_rx).await;

            service
                .complete_execution(&execution_id, finalized, started_at.elapsed())
                .await;
        });
    }

    async fn run_command(
        &self,
        command_str: &str,
        cancel_rx: oneshot::Receiver<()>,
    ) -> FinalizedExecution {
        let parts = match parse_command(command_str) {
            Ok(parts) => parts,
            Err(error) => {
                return FinalizedExecution {
                    state: CommandExecutionState::Error,
                    output: Some(error),
                    stdout: None,
                    stderr: None,
                    exit_code: None,
                };
            }
        };

        if parts.is_empty() {
            return FinalizedExecution {
                state: CommandExecutionState::Error,
                output: Some("Empty command".to_string()),
                stdout: None,
                stderr: None,
                exit_code: None,
            };
        }

        let cmd = &parts[0];
        let args = &parts[1..];

        if cmd != "txio" {
            return FinalizedExecution {
                state: CommandExecutionState::Error,
                output: Some(format!(
                    "bash: command not found: {}. Only 'txio' is authorized.",
                    cmd
                )),
                stdout: None,
                stderr: None,
                exit_code: Some(127),
            };
        }

        let mut child = match Command::new(cmd)
            .args(args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
        {
            Ok(child) => child,
            Err(error) => {
                return FinalizedExecution {
                    state: CommandExecutionState::Error,
                    output: Some(format!("Failed to spawn command: {}", error)),
                    stdout: None,
                    stderr: None,
                    exit_code: None,
                };
            }
        };

        let stdout_handle = spawn_output_reader(child.stdout.take());
        let stderr_handle = spawn_output_reader(child.stderr.take());

        let outcome = tokio::select! {
            status = child.wait() => WaitOutcome::Finished(status),
            _ = cancel_rx => WaitOutcome::Cancelled,
            _ = sleep(COMMAND_TIMEOUT) => WaitOutcome::TimedOut,
        };

        let stdout = collect_output(stdout_handle).await;
        let stderr = collect_output(stderr_handle).await;

        match outcome {
            WaitOutcome::Finished(Ok(status)) => {
                let exit_code = status.code();
                let success = status.success();

                let output = if success {
                    stdout.clone().or_else(|| stderr.clone())
                } else {
                    stderr.clone().or_else(|| stdout.clone())
                };

                FinalizedExecution {
                    state: if success {
                        CommandExecutionState::Success
                    } else {
                        CommandExecutionState::Error
                    },
                    output: non_empty(output),
                    stdout: non_empty(stdout),
                    stderr: non_empty(stderr),
                    exit_code,
                }
            }
            WaitOutcome::Finished(Err(error)) => FinalizedExecution {
                state: CommandExecutionState::Error,
                output: Some(format!("Command execution failed: {}", error)),
                stdout: non_empty(stdout),
                stderr: non_empty(stderr),
                exit_code: None,
            },
            WaitOutcome::Cancelled => {
                let _ = child.kill().await;

                FinalizedExecution {
                    state: CommandExecutionState::Cancelled,
                    output: non_empty(stdout.clone().or_else(|| stderr.clone())),
                    stdout: non_empty(stdout),
                    stderr: non_empty(stderr),
                    exit_code: None,
                }
            }
            WaitOutcome::TimedOut => {
                let _ = child.kill().await;

                let output = format!(
                    "Command timed out after {} seconds",
                    COMMAND_TIMEOUT.as_secs()
                );

                FinalizedExecution {
                    state: CommandExecutionState::TimedOut,
                    output: non_empty(Some(output)),
                    stdout: non_empty(stdout),
                    stderr: non_empty(stderr),
                    exit_code: None,
                }
            }
        }
    }

    async fn complete_execution(
        &self,
        execution_id: &str,
        finalized: FinalizedExecution,
        elapsed: Duration,
    ) {
        let mut executions = self.executions.write().await;
        let Some(record) = executions.get_mut(execution_id) else {
            return;
        };

        record.state = finalized.state;
        // Cap each output field before storing to bound per-record memory use.
        record.output = cap_output(finalized.output, MAX_OUTPUT_BYTES);
        record.stdout = cap_output(finalized.stdout, MAX_OUTPUT_BYTES);
        record.stderr = cap_output(finalized.stderr, MAX_OUTPUT_BYTES);
        record.exit_code = finalized.exit_code;
        record.duration_ms = Some(elapsed.as_millis().min(u64::MAX as u128) as u64);
        record.cancel_tx = None;
        record.completed_at = Some(Instant::now());
    }
}

const MAX_CAPTURED_OUTPUT_BYTES: usize = 1024 * 1024;

fn spawn_output_reader<R>(stream: Option<R>) -> Option<JoinHandle<String>>
where
    R: tokio::io::AsyncRead + Unpin + Send + 'static,
{
    stream.map(|mut reader| {
        tokio::spawn(async move {
            // Read at most MAX_OUTPUT_BYTES so a process with large output
            // cannot exhaust process memory before cap_output runs.  Bytes
            // beyond the cap are silently discarded so the child's pipe never
            // blocks.  cap_output keeps the tail for post-mortem diagnosis;
            // with the head already capped the tail is at worst MAX_OUTPUT_BYTES.
            let mut buffer = Vec::with_capacity(MAX_OUTPUT_BYTES);
            let mut chunk = [0u8; 8192];
            loop {
                match reader.read(&mut chunk).await {
                    Ok(0) => break,
                    Ok(n) => {
                        if buffer.len() < MAX_OUTPUT_BYTES {
                            let space = MAX_OUTPUT_BYTES - buffer.len();
                            buffer.extend_from_slice(&chunk[..n.min(space)]);
                        }
                        // bytes beyond the cap are intentionally dropped here
                        // so the child process does not block on a full pipe.
                    }
                    Err(error) => {
                        return format!("Failed to read process output: {}", error);
                    }
                }
            }
            String::from_utf8_lossy(&buffer).to_string()

        })
    })
}

async fn collect_output(handle: Option<JoinHandle<String>>) -> Option<String> {
    match handle {
        Some(h) => h.await.ok(),
        None => None,
    }
}

fn non_empty(s: Option<String>) -> Option<String> {
    s.filter(|v| !v.trim().is_empty())
}

fn parse_command(input: &str) -> Result<Vec<String>, String> {
    let mut args = Vec::new();
    let mut current = String::new();
    let mut quote: Option<char> = None;
    let mut escape = false;

    for ch in input.chars() {
        if escape {
            current.push(ch);
            escape = false;
            continue;
        }

        match ch {
            '\\' if quote != Some('\'') => {
                escape = true;
            }
            '"' | '\'' => {
                if let Some(active_quote) = quote {
                    if active_quote == ch {
                        quote = None;
                    } else {
                        current.push(ch);
                    }
                } else {
                    quote = Some(ch);
                }
            }
            c if c.is_whitespace() && quote.is_none() => {
                if !current.is_empty() {
                    args.push(std::mem::take(&mut current));
                }
            }
            _ => current.push(ch),
        }
    }

    if escape || quote.is_some() {
        return Err("Malformed command: unmatched quotes or invalid escaping.".to_string());
    }

    if !current.is_empty() {
        args.push(current);
    }

    Ok(args)
}
