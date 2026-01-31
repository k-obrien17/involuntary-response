use std::path::Path;
use tauri::State;
use crate::ai;
use crate::settings::Settings;
use crate::vault;
use crate::quote;
use crate::derive;

type SettingsState<'a> = State<'a, Settings>;

#[derive(Debug, serde::Serialize)]
pub struct CommandError {
    message: String,
}

impl From<String> for CommandError {
    fn from(message: String) -> Self {
        CommandError { message }
    }
}

type CommandResult<T> = Result<T, CommandError>;

fn get_vault_path(settings: &Settings) -> CommandResult<String> {
    settings
        .get("vault_path")
        .ok_or_else(|| CommandError::from("Vault path not configured".to_string()))
}

// --- Vault commands ---

#[tauri::command]
pub fn list_executives(settings: SettingsState<'_>) -> CommandResult<Vec<vault::VaultExecutive>> {
    let vault_path = get_vault_path(&settings)?;
    vault::discover_executives(Path::new(&vault_path)).map_err(|e| e.into())
}

#[tauri::command]
pub fn get_voice_scoreboard(settings: SettingsState<'_>, voice_path: String) -> CommandResult<vault::VoiceScoreboard> {
    let _ = get_vault_path(&settings)?;
    vault::get_scoreboard(Path::new(&voice_path)).map_err(|e| e.into())
}

#[tauri::command]
pub fn list_voice_files(
    settings: SettingsState<'_>,
    voice_path: String,
    file_type: Option<String>,
) -> CommandResult<Vec<vault::VaultFile>> {
    let _ = get_vault_path(&settings)?;
    let ft = file_type.and_then(|s| vault::VoiceFileType::from_str(&s));
    vault::list_voice_files(Path::new(&voice_path), ft.as_ref()).map_err(|e| e.into())
}

#[tauri::command]
pub fn get_voice_kernel(settings: SettingsState<'_>, voice_path: String) -> CommandResult<Option<vault::VaultFile>> {
    let _ = get_vault_path(&settings)?;
    quote::get_voice_kernel(Path::new(&voice_path)).map_err(|e| e.into())
}

#[tauri::command]
pub fn create_quote(
    settings: SettingsState<'_>,
    voice_path: String,
    speaker: String,
    input: quote::CreateQuoteInput,
) -> CommandResult<vault::VaultFile> {
    let _ = get_vault_path(&settings)?;
    quote::create_quote(Path::new(&voice_path), &speaker, &input).map_err(|e| e.into())
}

#[tauri::command]
pub fn list_quotes(settings: SettingsState<'_>, voice_path: String) -> CommandResult<Vec<vault::VaultFile>> {
    let _ = get_vault_path(&settings)?;
    vault::list_voice_files(
        Path::new(&voice_path),
        Some(&vault::VoiceFileType::VoiceQuote),
    )
    .map_err(|e| e.into())
}

#[tauri::command]
pub fn read_vault_file(path: String) -> CommandResult<vault::VaultFile> {
    vault::read_vault_file(Path::new(&path)).map_err(|e| e.into())
}

// --- Derivation commands ---

#[derive(Debug, serde::Serialize)]
pub struct DerivationContext {
    pub system_prompt: String,
    pub quotes_text: String,
    pub all_derived: String,
}

#[tauri::command]
pub fn get_derivation_context(
    settings: SettingsState<'_>,
    voice_path: String,
    derivation_type: String,
    speaker: String,
) -> CommandResult<DerivationContext> {
    let _ = get_vault_path(&settings)?;
    let quotes_text = derive::gather_quotes_for_derivation(Path::new(&voice_path))
        .map_err(CommandError::from)?;
    let system_prompt = derive::get_derivation_prompt(&derivation_type, &speaker);

    let all_derived = if derivation_type == "kernel" {
        derive::gather_all_derived(Path::new(&voice_path)).map_err(CommandError::from)?
    } else {
        String::new()
    };

    Ok(DerivationContext {
        system_prompt,
        quotes_text,
        all_derived,
    })
}

#[tauri::command]
pub fn write_derived_file(
    settings: SettingsState<'_>,
    voice_path: String,
    file_type: String,
    title: String,
    frontmatter_fields: std::collections::HashMap<String, serde_json::Value>,
    body: String,
) -> CommandResult<vault::VaultFile> {
    let _ = get_vault_path(&settings)?;
    let vft = vault::VoiceFileType::from_str(&file_type)
        .ok_or_else(|| CommandError::from(format!("Unknown file type: {}", file_type)))?;

    let id = vault::generate_next_id(Path::new(&voice_path), &vft)
        .map_err(CommandError::from)?;

    let mut fields = std::collections::HashMap::new();
    fields.insert("id".into(), serde_yaml::Value::String(id.clone()));
    fields.insert("type".into(), serde_yaml::Value::String(file_type));
    fields.insert("voice_system".into(), serde_yaml::Value::Bool(true));

    for (key, value) in frontmatter_fields {
        let yaml_val = serde_json::from_value::<serde_yaml::Value>(value)
            .unwrap_or(serde_yaml::Value::Null);
        fields.insert(key, yaml_val);
    }

    let frontmatter = vault::Frontmatter { fields };
    let file_path = vault::get_voice_file_path(Path::new(&voice_path), &vft, &id, &title);
    vault::write_vault_file(&file_path, &frontmatter, &body).map_err(CommandError::from)?;
    vault::read_vault_file(&file_path).map_err(CommandError::from)
}

// --- Settings commands ---

#[tauri::command]
pub fn get_setting(settings: SettingsState<'_>, key: String) -> CommandResult<Option<String>> {
    Ok(settings.get(&key))
}

#[tauri::command]
pub fn set_setting(settings: SettingsState<'_>, key: String, value: String) -> CommandResult<()> {
    settings.set(&key, &value).map_err(CommandError::from)
}

// --- AI commands ---

#[tauri::command]
pub async fn generate_with_claude(
    settings: SettingsState<'_>,
    system_prompt: String,
    user_message: String,
    max_tokens: Option<u32>,
) -> CommandResult<String> {
    let api_key = settings
        .get("api_key")
        .ok_or_else(|| CommandError::from("API key not configured. Go to Settings to add it.".to_string()))?;

    ai::call_claude(&api_key, &system_prompt, &user_message, max_tokens.unwrap_or(4096))
        .await
        .map_err(CommandError::from)
}

#[tauri::command]
pub async fn generate_with_claude_stream(
    app_handle: tauri::AppHandle,
    settings: SettingsState<'_>,
    system_prompt: String,
    user_message: String,
    max_tokens: Option<u32>,
) -> CommandResult<()> {
    let api_key = settings
        .get("api_key")
        .ok_or_else(|| CommandError::from("API key not configured. Go to Settings to add it.".to_string()))?;

    ai::call_claude_streaming(
        &app_handle,
        &api_key,
        &system_prompt,
        &user_message,
        max_tokens.unwrap_or(4096),
    )
    .await
    .map_err(CommandError::from)
}

// --- Anti-voice commands ---

#[tauri::command]
pub fn create_anti_voice(
    settings: SettingsState<'_>,
    voice_path: String,
    speaker: String,
    feedback: String,
    summary: String,
) -> CommandResult<vault::VaultFile> {
    let _ = get_vault_path(&settings)?;

    let file_type = vault::VoiceFileType::VoiceAntivoice;
    let id = vault::generate_next_id(Path::new(&voice_path), &file_type)
        .map_err(CommandError::from)?;
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    let mut fields = std::collections::HashMap::new();
    fields.insert("id".into(), serde_yaml::Value::String(id.clone()));
    fields.insert("type".into(), serde_yaml::Value::String("voice-antivoice".into()));
    fields.insert("voice_system".into(), serde_yaml::Value::Bool(true));
    fields.insert(
        "speaker".into(),
        serde_yaml::Value::String(format!("\"[[{}]]\"", speaker)),
    );
    fields.insert("created".into(), serde_yaml::Value::String(today));
    fields.insert("source".into(), serde_yaml::Value::String("draft-feedback".into()));

    let frontmatter = vault::Frontmatter { fields };

    let body = format!(
        "# Anti-Voice: {}\n\n## Feedback\n{}\n\n## Patterns to avoid\n- (extract from feedback above)\n",
        summary, feedback
    );

    let file_path = vault::get_voice_file_path(Path::new(&voice_path), &file_type, &id, &summary);
    vault::write_vault_file(&file_path, &frontmatter, &body).map_err(CommandError::from)?;
    vault::read_vault_file(&file_path).map_err(CommandError::from)
}
