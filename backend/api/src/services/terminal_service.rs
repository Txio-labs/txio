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

impl TerminalService {
    pub fn new() -> Self {
        Self {
            executions: Arc::new(RwLock::new(HashMap::new())),
        }
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
                    output: Some(format!("Execution failed: {}", error)),
                    stdout: None,
                    stderr: None,
                    exit_code: None,
                };
            }
        };

        let stdout_task = spawn_output_reader(child.stdout.take());
        let stderr_task = spawn_output_reader(child.stderr.take());

        let wait_outcome = wait_for_child(&mut child, cancel_rx).await;

        let stdout = join_output(stdout_task).await;
        let stderr = join_output(stderr_task).await;

        match wait_outcome {
            WaitOutcome::Finished(result) => match result {
                Ok(status) => {
                    let exit_code = status.code();
                    let state = if status.success() {
                        CommandExecutionState::Success
                    } else {
                        CommandExecutionState::Error
                    };

                    let output = match state {
                        CommandExecutionState::Success => {
                            if !stdout.trim().is_empty() {
                                stdout.clone()
                            } else {
                                stderr.clone()
                            }
                        }
                        _ => {
                            if !stderr.trim().is_empty() {
                                stderr.clone()
                            } else {
                                stdout.clone()
                            }
                        }
                    };

                    FinalizedExecution {
                        state,
                        output: non_empty(output),
                        stdout: non_empty(stdout),
                        stderr: non_empty(stderr),
                        exit_code,
                    }
                }
                Err(error) => FinalizedExecution {
                    state: CommandExecutionState::Error,
                    output: Some(format!("Execution failed: {}", error)),
                    stdout: non_empty(stdout),
                    stderr: non_empty(stderr),
                    exit_code: None,
                },
            },
            WaitOutcome::Cancelled => {
                let output = if !stderr.trim().is_empty() {
                    stderr.clone()
                } else if !stdout.trim().is_empty() {
                    stdout.clone()
                } else {
                    "Command cancelled.".to_string()
                };

                FinalizedExecution {
                    state: CommandExecutionState::Cancelled,
                    output: non_empty(output),
                    stdout: non_empty(stdout),
                    stderr: non_empty(stderr),
                    exit_code: None,
                }
            }
            WaitOutcome::TimedOut => {
                let output = if !stderr.trim().is_empty() {
                    stderr.clone()
                } else if !stdout.trim().is_empty() {
                    stdout.clone()
                } else {
                    format!(
                        "Command timed out after {} seconds.",
                        COMMAND_TIMEOUT.as_secs()
                    )
                };

                FinalizedExecution {
                    state: CommandExecutionState::TimedOut,
                    output: non_empty(output),
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
        record.output = finalized.output;
        record.stdout = finalized.stdout;
        record.stderr = finalized.stderr;
        record.exit_code = finalized.exit_code;
        record.duration_ms = Some(elapsed.as_millis().min(u64::MAX as u128) as u64);
        record.cancel_tx = None;
    }
}

fn spawn_output_reader<R>(stream: Option<R>) -> Option<JoinHandle<String>>
where
    R: tokio::io::AsyncRead + Unpin + Send + 'static,
{
    stream.map(|mut reader| {
        tokio::spawn(async move {
            let mut buffer = Vec::new();

            match reader.read_to_end(&mut buffer).await {
                Ok(_) => String::from_utf8_lossy(&buffer).to_string(),
                Err(error) => format!("Failed to read process output: {}", error),
            }
        })
    })
}

async fn join_output(handle: Option<JoinHandle<String>>) -> String {
    match handle {
        Some(handle) => handle
            .await
            .unwrap_or_else(|error| format!("Failed to join process output task: {}", error)),
        None => String::new(),
    }
}

async fn wait_for_child(
    child: &mut tokio::process::Child,
    cancel_rx: oneshot::Receiver<()>,
) -> WaitOutcome {
    tokio::pin!(cancel_rx);
    let timeout = sleep(COMMAND_TIMEOUT);
    tokio::pin!(timeout);

    tokio::select! {
        result = child.wait() => {
            WaitOutcome::Finished(result)
        }
        _ = &mut cancel_rx => {
            let _ = child.kill().await;
            let _ = child.wait().await;
            WaitOutcome::Cancelled
        }
        _ = &mut timeout => {
            let _ = child.kill().await;
            let _ = child.wait().await;
            WaitOutcome::TimedOut
        }
    }
}

fn non_empty(value: String) -> Option<String> {
    if value.trim().is_empty() {
        None
    } else {
        Some(value)
    }
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
