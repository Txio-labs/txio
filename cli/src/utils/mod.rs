use std::fs;
use std::path::{Path, PathBuf};
use anyhow::{Result, anyhow};
use serde_json;

/// Load environment overrides for the CLI.
///
/// Security: unlike the previous `dotenvy::dotenv()` call, this does NOT search
/// the current directory (or its ancestors) for a `.env` file. Overrides come
/// only from the trusted config dir (`~/.txio/.env`) plus an explicit
/// `--env-file` opt-in.
///
/// Precedence (highest wins): pre-existing process env vars, then `--env-file`,
/// then `~/.txio/.env`. dotenvy's `from_path` is non-override (it sets a var
/// only when it is not already present), so loading the explicit file first
/// makes it win over the trusted default, while real process env — set before
/// either loader runs — always wins over both.
pub fn load_environment(explicit_env_file: Option<&Path>) -> Result<()> {
    let mut trusted = get_config_dir();
    trusted.push(".env");
    let cwd_env = Path::new(".env");
    load_env_files(explicit_env_file, &trusted, cwd_env)
}

fn load_env_files(explicit: Option<&Path>, trusted_env: &Path, cwd_env: &Path) -> Result<()> {
    // Explicit opt-in first so it wins over the trusted default (dotenvy is
    // non-override: first loader to set a var wins). An explicitly requested
    // file that cannot be loaded is a hard error, not a silent shrug.
    if let Some(path) = explicit {
        dotenvy::from_path(path)
            .map_err(|e| anyhow!("failed to load --env-file '{}': {}", path.display(), e))?;
    }

    // Trusted config dir: best-effort, silent when absent.
    if trusted_env.exists() {
        let _ = dotenvy::from_path(trusted_env);
    }

    // Discoverability: a planted `./.env` is never auto-loaded; if one is present
    // and the user did not opt in, point them at the explicit flag.
    if should_warn_unloaded_cwd_env(explicit.is_some(), cwd_env) {
        eprintln!("warning: found ./.env but it was not loaded; pass --env-file .env to use it");
    }

    Ok(())
}

/// Whether to emit the "found ./.env but it was not loaded" discoverability
/// warning: only when the user did not pass `--env-file` and a `./.env` exists.
fn should_warn_unloaded_cwd_env(explicit_provided: bool, cwd_env: &Path) -> bool {
    !explicit_provided && cwd_env.exists()
}

pub fn get_config_dir() -> PathBuf {
    let mut path = dirs_next::home_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push(".txio");
    if !path.exists() {
        fs::create_dir_all(&path).ok();
    }
    path
}

pub fn save_current_chain(chain: &str) -> Result<()> {
    let mut path = get_config_dir();
    path.push("current_chain");
    fs::write(path, chain)?;
    Ok(())
}

pub fn get_current_chain() -> Option<String> {
    let mut path = get_config_dir();
    path.push("current_chain");
    fs::read_to_string(path).ok().map(|s| s.trim().to_string())
}

pub fn save_token(token: &str) -> Result<()> {
    let mut path = get_config_dir();
    path.push("token");
    fs::write(path, token)?;
    Ok(())
}

pub fn get_token() -> Option<String> {
    let mut path = get_config_dir();
    path.push("token");
    fs::read_to_string(path).ok().map(|s| s.trim().to_string())
}

pub fn remove_token() -> Result<()> {
    let mut path = get_config_dir();
    path.push("token");
    if path.exists() {
        fs::remove_file(path)?;
    }
    Ok(())
}

pub fn save_config(key: &str, value: &str) -> Result<()> {
    let mut path = get_config_dir();
    path.push("config.json");
    let mut map: serde_json::Map<String, serde_json::Value> = if path.exists() {
        let content = fs::read_to_string(&path)?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        serde_json::Map::new()
    };
    map.insert(key.to_string(), serde_json::Value::String(value.to_string()));
    fs::write(path, serde_json::to_string_pretty(&map)?)?;
    Ok(())
}

pub fn get_config(key: &str) -> Result<Option<String>> {
    let mut path = get_config_dir();
    path.push("config.json");
    if !path.exists() {
        return Ok(None);
    }
    let content = fs::read_to_string(&path)?;
    let map: serde_json::Map<String, serde_json::Value> =
        serde_json::from_str(&content).unwrap_or_default();
    Ok(map.get(key).and_then(|v| v.as_str()).map(|s| s.to_string()))
}

pub fn list_config() -> Result<Vec<(String, String)>> {
    let mut path = get_config_dir();
    path.push("config.json");
    if !path.exists() {
        return Ok(vec![]);
    }
    let content = fs::read_to_string(&path)?;
    let map: serde_json::Map<String, serde_json::Value> =
        serde_json::from_str(&content).unwrap_or_default();
    Ok(map
        .into_iter()
        .filter_map(|(k, v)| v.as_str().map(|s| (k, s.to_string())))
        .collect())
}

pub fn remove_config(key: &str) -> Result<()> {
    let mut path = get_config_dir();
    path.push("config.json");
    if !path.exists() {
        return Ok(());
    }
    let content = fs::read_to_string(&path)?;
    let mut map: serde_json::Map<String, serde_json::Value> =
        serde_json::from_str(&content).unwrap_or_default();
    map.remove(key);
    fs::write(path, serde_json::to_string_pretty(&map)?)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use std::sync::Mutex;
    use std::sync::atomic::{AtomicU64, Ordering};

    // Env vars are process-global. Serialize every test that reads or writes the
    // process environment so parallel test threads can't observe each other's
    // mutations. Combined with per-test unique var KEYS, this keeps the suite
    // deterministic.
    static ENV_LOCK: Mutex<()> = Mutex::new(());
    static COUNTER: AtomicU64 = AtomicU64::new(0);

    /// A unique-per-call scratch directory under the OS temp dir.
    fn unique_dir(tag: &str) -> PathBuf {
        let n = COUNTER.fetch_add(1, Ordering::SeqCst);
        let mut d = std::env::temp_dir();
        d.push(format!(
            "txio_env_test_{}_{}_{}",
            tag,
            std::process::id(),
            n
        ));
        fs::create_dir_all(&d).unwrap();
        d
    }

    /// A unique env var key so concurrent tests never collide on the same name.
    fn unique_key(tag: &str) -> String {
        let n = COUNTER.fetch_add(1, Ordering::SeqCst);
        format!("TXIO_TEST_{}_{}_{}", tag, std::process::id(), n)
    }

    fn write_file(dir: &Path, name: &str, contents: &str) -> PathBuf {
        let p = dir.join(name);
        let mut f = fs::File::create(&p).unwrap();
        f.write_all(contents.as_bytes()).unwrap();
        p
    }

    #[test]
    fn loads_from_trusted_location() {
        let _g = ENV_LOCK.lock().unwrap();
        let dir = unique_dir("trusted");
        let key = unique_key("TRUSTED");
        let trusted = write_file(&dir, ".env", &format!("{}=from_trusted\n", key));
        let missing_cwd = dir.join("nope.env");

        load_env_files(None, &trusted, &missing_cwd).unwrap();

        assert_eq!(std::env::var(&key).unwrap(), "from_trusted");
        unsafe {
            std::env::remove_var(&key);
        }
    }

    #[test]
    fn does_not_load_cwd_env_by_default() {
        let _g = ENV_LOCK.lock().unwrap();
        let dir = unique_dir("cwd");
        let key = unique_key("CWD");
        // A ".env" sitting where the CWD file would be must never be read for values.
        let cwd_env = write_file(&dir, ".env", &format!("{}=planted\n", key));
        let missing_trusted = dir.join("trusted.env");

        load_env_files(None, &missing_trusted, &cwd_env).unwrap();

        assert!(
            std::env::var(&key).is_err(),
            "a CWD .env must not be loaded without --env-file"
        );
    }

    #[test]
    fn loads_explicit_env_file() {
        let _g = ENV_LOCK.lock().unwrap();
        let dir = unique_dir("explicit");
        let key = unique_key("EXPLICIT");
        let explicit = write_file(&dir, "custom.env", &format!("{}=from_explicit\n", key));
        let missing_trusted = dir.join("trusted.env");
        let missing_cwd = dir.join("nope.env");

        load_env_files(Some(&explicit), &missing_trusted, &missing_cwd).unwrap();

        assert_eq!(std::env::var(&key).unwrap(), "from_explicit");
        unsafe {
            std::env::remove_var(&key);
        }
    }

    #[test]
    fn missing_explicit_env_file_is_an_error() {
        let _g = ENV_LOCK.lock().unwrap();
        let dir = unique_dir("missing");
        let explicit = dir.join("does_not_exist.env");
        let missing_trusted = dir.join("trusted.env");
        let missing_cwd = dir.join("nope.env");

        let result = load_env_files(Some(&explicit), &missing_trusted, &missing_cwd);
        assert!(
            result.is_err(),
            "an explicitly requested missing file must error"
        );
    }

    #[test]
    fn explicit_env_file_wins_over_trusted() {
        let _g = ENV_LOCK.lock().unwrap();
        let dir = unique_dir("precedence");
        let key = unique_key("PRECEDENCE");
        let explicit = write_file(&dir, "explicit.env", &format!("{}=from_explicit\n", key));
        let trusted = write_file(&dir, ".env", &format!("{}=from_trusted\n", key));
        let missing_cwd = dir.join("nope.env");

        load_env_files(Some(&explicit), &trusted, &missing_cwd).unwrap();

        assert_eq!(
            std::env::var(&key).unwrap(),
            "from_explicit",
            "--env-file must take precedence over the trusted default"
        );
        unsafe {
            std::env::remove_var(&key);
        }
    }

    #[test]
    fn preexisting_env_var_is_never_clobbered() {
        let _g = ENV_LOCK.lock().unwrap();
        let dir = unique_dir("preexisting");
        let key = unique_key("PREEXISTING");
        unsafe {
            std::env::set_var(&key, "real_value");
        }

        let explicit = write_file(&dir, "explicit.env", &format!("{}=from_explicit\n", key));
        let trusted = write_file(&dir, ".env", &format!("{}=from_trusted\n", key));
        let missing_cwd = dir.join("nope.env");

        load_env_files(Some(&explicit), &trusted, &missing_cwd).unwrap();

        assert_eq!(
            std::env::var(&key).unwrap(),
            "real_value",
            "a pre-existing process env var must survive both loaders"
        );
        unsafe {
            std::env::remove_var(&key);
        }
    }

    #[test]
    fn warns_only_when_cwd_env_present_and_no_opt_in() {
        let dir = unique_dir("warn");
        let present = write_file(&dir, ".env", "X=1\n");
        let absent = dir.join("nope.env");

        // Warn: no opt-in and a ./.env exists.
        assert!(should_warn_unloaded_cwd_env(false, &present));
        // No warn: user opted in via --env-file.
        assert!(!should_warn_unloaded_cwd_env(true, &present));
        // No warn: no ./.env exists.
        assert!(!should_warn_unloaded_cwd_env(false, &absent));
    }
}
