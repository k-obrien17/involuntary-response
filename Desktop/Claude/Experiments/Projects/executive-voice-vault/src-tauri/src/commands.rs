use std::path::Path;
use tauri::{Emitter, State};
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
    pub anti_voice: String,
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

    let anti_voice = derive::gather_anti_voice(Path::new(&voice_path))
        .map_err(CommandError::from)?;

    Ok(DerivationContext {
        system_prompt,
        quotes_text,
        all_derived,
        anti_voice,
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

// --- Trend commands ---

#[tauri::command]
pub fn create_trend(
    settings: SettingsState<'_>,
    voice_path: String,
    speaker: String,
    headline: String,
    source_url: String,
    source_name: String,
    topic_tags: Vec<String>,
    notes: String,
) -> CommandResult<vault::VaultFile> {
    let _ = get_vault_path(&settings)?;

    let file_type = vault::VoiceFileType::VoiceTrend;
    let id = vault::generate_next_id(Path::new(&voice_path), &file_type)
        .map_err(CommandError::from)?;
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    let mut fields = std::collections::HashMap::new();
    fields.insert("id".into(), serde_yaml::Value::String(id.clone()));
    fields.insert("type".into(), serde_yaml::Value::String("voice-trend".into()));
    fields.insert("voice_system".into(), serde_yaml::Value::Bool(true));
    fields.insert(
        "speaker".into(),
        serde_yaml::Value::String(format!("\"[[{}]]\"", speaker)),
    );
    fields.insert("created".into(), serde_yaml::Value::String(today));
    fields.insert("status".into(), serde_yaml::Value::String("unread".into()));
    if !source_url.is_empty() {
        fields.insert("source_url".into(), serde_yaml::Value::String(source_url));
    }
    if !source_name.is_empty() {
        fields.insert("source_name".into(), serde_yaml::Value::String(source_name));
    }
    if !topic_tags.is_empty() {
        let tags: Vec<serde_yaml::Value> = topic_tags.into_iter().map(serde_yaml::Value::String).collect();
        fields.insert("topic_tags".into(), serde_yaml::Value::Sequence(tags));
    }

    let frontmatter = vault::Frontmatter { fields };
    let body = if notes.is_empty() {
        format!("# {}\n", headline)
    } else {
        format!("# {}\n\n{}\n", headline, notes)
    };

    let file_path = vault::get_voice_file_path(Path::new(&voice_path), &file_type, &id, &headline);
    vault::write_vault_file(&file_path, &frontmatter, &body).map_err(CommandError::from)?;
    vault::read_vault_file(&file_path).map_err(CommandError::from)
}

#[tauri::command]
pub fn update_trend_status(
    settings: SettingsState<'_>,
    path: String,
    status: String,
) -> CommandResult<vault::VaultFile> {
    let _ = get_vault_path(&settings)?;
    let mut file = vault::read_vault_file(Path::new(&path)).map_err(CommandError::from)?;
    file.frontmatter.fields.insert("status".into(), serde_yaml::Value::String(status));
    vault::write_vault_file(Path::new(&path), &file.frontmatter, &file.body)
        .map_err(CommandError::from)?;
    vault::read_vault_file(Path::new(&path)).map_err(CommandError::from)
}

// --- Draft commands ---

#[tauri::command]
pub fn create_draft_placeholder(
    settings: SettingsState<'_>,
    voice_path: String,
    speaker: String,
    topic: String,
    format: String,
    notes: String,
) -> CommandResult<vault::VaultFile> {
    let _ = get_vault_path(&settings)?;

    let file_type = vault::VoiceFileType::VoiceDraft;
    let id = vault::generate_next_id(Path::new(&voice_path), &file_type)
        .map_err(CommandError::from)?;
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    let mut fields = std::collections::HashMap::new();
    fields.insert("id".into(), serde_yaml::Value::String(id.clone()));
    fields.insert("type".into(), serde_yaml::Value::String("voice-draft".into()));
    fields.insert("voice_system".into(), serde_yaml::Value::Bool(true));
    fields.insert(
        "speaker".into(),
        serde_yaml::Value::String(format!("\"[[{}]]\"", speaker)),
    );
    fields.insert("created".into(), serde_yaml::Value::String(today));
    fields.insert("status".into(), serde_yaml::Value::String("queued".into()));
    fields.insert("draft_format".into(), serde_yaml::Value::String(format));
    fields.insert("draft_topic".into(), serde_yaml::Value::String(topic.clone()));

    let frontmatter = vault::Frontmatter { fields };
    let body = if notes.is_empty() {
        format!("# {}\n\n*(queued — content not yet generated)*\n", topic)
    } else {
        format!("# {}\n\n{}\n", topic, notes)
    };

    let file_path = vault::get_voice_file_path(Path::new(&voice_path), &file_type, &id, &topic);
    vault::write_vault_file(&file_path, &frontmatter, &body).map_err(CommandError::from)?;
    vault::read_vault_file(&file_path).map_err(CommandError::from)
}

#[tauri::command]
pub fn update_file_status(
    settings: SettingsState<'_>,
    path: String,
    status: String,
) -> CommandResult<vault::VaultFile> {
    let _ = get_vault_path(&settings)?;
    let mut file = vault::read_vault_file(Path::new(&path)).map_err(CommandError::from)?;
    file.frontmatter.fields.insert("status".into(), serde_yaml::Value::String(status));
    vault::write_vault_file(Path::new(&path), &file.frontmatter, &file.body)
        .map_err(CommandError::from)?;
    vault::read_vault_file(Path::new(&path)).map_err(CommandError::from)
}

#[tauri::command]
pub fn update_file_body(
    settings: SettingsState<'_>,
    path: String,
    body: String,
) -> CommandResult<vault::VaultFile> {
    let _ = get_vault_path(&settings)?;
    let file = vault::read_vault_file(Path::new(&path)).map_err(CommandError::from)?;
    vault::write_vault_file(Path::new(&path), &file.frontmatter, &body)
        .map_err(CommandError::from)?;
    vault::read_vault_file(Path::new(&path)).map_err(CommandError::from)
}

// --- Key facts commands ---

#[tauri::command]
pub fn create_keyfact(
    settings: SettingsState<'_>,
    voice_path: String,
    speaker: String,
    title: String,
    fact_category: String,
    fact_value: String,
    source: String,
    context: String,
) -> CommandResult<vault::VaultFile> {
    let _ = get_vault_path(&settings)?;

    let file_type = vault::VoiceFileType::VoiceKeyfact;
    let id = vault::generate_next_id(Path::new(&voice_path), &file_type)
        .map_err(CommandError::from)?;
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    let mut fields = std::collections::HashMap::new();
    fields.insert("id".into(), serde_yaml::Value::String(id.clone()));
    fields.insert("type".into(), serde_yaml::Value::String("voice-keyfact".into()));
    fields.insert("voice_system".into(), serde_yaml::Value::Bool(true));
    fields.insert(
        "speaker".into(),
        serde_yaml::Value::String(format!("\"[[{}]]\"", speaker)),
    );
    fields.insert("fact_category".into(), serde_yaml::Value::String(fact_category));
    fields.insert("fact_value".into(), serde_yaml::Value::String(fact_value.clone()));
    fields.insert("source".into(), serde_yaml::Value::String(source));
    fields.insert("date_valid".into(), serde_yaml::Value::String(today));

    let frontmatter = vault::Frontmatter { fields };
    let body = if context.is_empty() {
        format!("# {}\n\n{}\n", title, fact_value)
    } else {
        format!("# {}\n\n{}\n\n## Context\n{}\n", title, fact_value, context)
    };

    let file_path = vault::get_voice_file_path(Path::new(&voice_path), &file_type, &id, &title);
    vault::write_vault_file(&file_path, &frontmatter, &body).map_err(CommandError::from)?;
    vault::read_vault_file(&file_path).map_err(CommandError::from)
}

#[tauri::command]
pub fn list_keyfacts(
    settings: SettingsState<'_>,
    voice_path: String,
) -> CommandResult<Vec<vault::VaultFile>> {
    let _ = get_vault_path(&settings)?;
    vault::list_voice_files(
        Path::new(&voice_path),
        Some(&vault::VoiceFileType::VoiceKeyfact),
    )
    .map_err(|e| e.into())
}

// --- Anti-voice context ---

#[tauri::command]
pub fn get_anti_voice_context(
    settings: SettingsState<'_>,
    voice_path: String,
) -> CommandResult<String> {
    let _ = get_vault_path(&settings)?;
    derive::gather_anti_voice(Path::new(&voice_path)).map_err(CommandError::from)
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

// --- Voice intake commands ---

#[derive(Debug, serde::Deserialize, serde::Serialize, Clone)]
pub struct VoiceIntent {
    pub executive_name: String,
    pub action: String,
    pub format: String,
    pub topic: String,
    pub notes: String,
}

#[tauri::command]
pub async fn transcribe_and_parse(
    app_handle: tauri::AppHandle,
    settings: SettingsState<'_>,
    audio_bytes: Vec<u8>,
    executive_names: Vec<String>,
) -> CommandResult<Vec<VoiceIntent>> {
    let openai_key = settings
        .get("openai_api_key")
        .ok_or_else(|| CommandError::from("OpenAI API key not configured. Go to Settings to add it.".to_string()))?;
    let anthropic_key = settings
        .get("api_key")
        .ok_or_else(|| CommandError::from("Anthropic API key not configured.".to_string()))?;

    // Step 1: Transcribe
    let transcript = ai::transcribe_audio(&openai_key, audio_bytes)
        .await
        .map_err(CommandError::from)?;

    let _ = app_handle.emit("voice-intake-transcript", &transcript);

    // Step 2: Parse with Claude
    let names_list = executive_names.join(", ");
    let system_prompt = format!(
        r#"You are a voice intake parser for an executive content management system.

Given a transcript of someone describing content deliverables, extract each distinct content intent.

Known executives: {}

For each intent, output a JSON object:
{{
  "executive_name": "exact match from known list",
  "action": "queue_draft" or "create_trend",
  "format": "social-post" | "talking-points" | "op-ed" | "memo" | "email" | "blog-post",
  "topic": "brief topic description",
  "notes": "any additional context mentioned"
}}

Output a JSON array of intents. Only output the JSON, no other text.

Rules:
- Match executive names fuzzy (first name only is fine)
- Default format to "social-post" if not specified
- If the speaker says "post about", "write about", "LinkedIn" → queue_draft
- If the speaker says "track", "watch", "trending", "article about" → create_trend
- Capture any mentioned angles, data points, or references in notes"#,
        names_list
    );

    let response = ai::call_claude(&anthropic_key, &system_prompt, &transcript, 2048)
        .await
        .map_err(CommandError::from)?;

    let intents: Vec<VoiceIntent> = serde_json::from_str(&response)
        .map_err(|e| CommandError::from(format!("Failed to parse intents: {}. Raw: {}", e, response)))?;

    let _ = app_handle.emit("voice-intake-parsed", &intents);
    let _ = app_handle.emit("voice-intake-done", ());

    Ok(intents)
}

#[tauri::command]
pub async fn parse_transcript(
    settings: SettingsState<'_>,
    transcript: String,
    executive_names: Vec<String>,
) -> CommandResult<Vec<VoiceIntent>> {
    let anthropic_key = settings
        .get("api_key")
        .ok_or_else(|| CommandError::from("Anthropic API key not configured.".to_string()))?;

    let names_list = executive_names.join(", ");
    let system_prompt = format!(
        r#"You are a voice intake parser for an executive content management system.

Given a transcript of someone describing content deliverables, extract each distinct content intent.

Known executives: {}

For each intent, output a JSON object:
{{
  "executive_name": "exact match from known list",
  "action": "queue_draft" or "create_trend",
  "format": "social-post" | "talking-points" | "op-ed" | "memo" | "email" | "blog-post",
  "topic": "brief topic description",
  "notes": "any additional context mentioned"
}}

Output a JSON array of intents. Only output the JSON, no other text.

Rules:
- Match executive names fuzzy (first name only is fine)
- Default format to "social-post" if not specified
- If the speaker says "post about", "write about", "LinkedIn" → queue_draft
- If the speaker says "track", "watch", "trending", "article about" → create_trend
- Capture any mentioned angles, data points, or references in notes"#,
        names_list
    );

    let response = ai::call_claude(&anthropic_key, &system_prompt, &transcript, 2048)
        .await
        .map_err(CommandError::from)?;

    let intents: Vec<VoiceIntent> = serde_json::from_str(&response)
        .map_err(|e| CommandError::from(format!("Failed to parse intents: {}. Raw: {}", e, response)))?;

    Ok(intents)
}

#[tauri::command]
pub fn dispatch_voice_intents(
    settings: SettingsState<'_>,
    intents: Vec<VoiceIntent>,
) -> CommandResult<u32> {
    let vault_path = get_vault_path(&settings)?;
    let executives = vault::discover_executives(std::path::Path::new(&vault_path))
        .map_err(CommandError::from)?;

    let mut dispatched = 0u32;

    for intent in &intents {
        let exec = executives.iter().find(|e| {
            e.name.eq_ignore_ascii_case(&intent.executive_name)
                || e.name.to_lowercase().starts_with(&intent.executive_name.to_lowercase())
        });

        let exec = match exec {
            Some(e) => e,
            None => continue,
        };

        let voice_path = &exec.voice_path;
        let speaker = &exec.name;

        match intent.action.as_str() {
            "queue_draft" => {
                let file_type = vault::VoiceFileType::VoiceDraft;
                let id = vault::generate_next_id(std::path::Path::new(voice_path), &file_type)
                    .map_err(CommandError::from)?;
                let today = chrono::Local::now().format("%Y-%m-%d").to_string();

                let mut fields = std::collections::HashMap::new();
                fields.insert("id".into(), serde_yaml::Value::String(id.clone()));
                fields.insert("type".into(), serde_yaml::Value::String("voice-draft".into()));
                fields.insert("voice_system".into(), serde_yaml::Value::Bool(true));
                fields.insert("speaker".into(), serde_yaml::Value::String(format!("\"[[{}]]\"", speaker)));
                fields.insert("created".into(), serde_yaml::Value::String(today));
                fields.insert("status".into(), serde_yaml::Value::String("queued".into()));
                fields.insert("draft_format".into(), serde_yaml::Value::String(intent.format.clone()));
                fields.insert("draft_topic".into(), serde_yaml::Value::String(intent.topic.clone()));

                let frontmatter = vault::Frontmatter { fields };
                let body = if intent.notes.is_empty() {
                    format!("# {}\n\n*(queued — content not yet generated)*\n", intent.topic)
                } else {
                    format!("# {}\n\n{}\n", intent.topic, intent.notes)
                };

                let file_path = vault::get_voice_file_path(std::path::Path::new(voice_path), &file_type, &id, &intent.topic);
                vault::write_vault_file(&file_path, &frontmatter, &body).map_err(CommandError::from)?;
                dispatched += 1;
            }
            "create_trend" => {
                let file_type = vault::VoiceFileType::VoiceTrend;
                let id = vault::generate_next_id(std::path::Path::new(voice_path), &file_type)
                    .map_err(CommandError::from)?;
                let today = chrono::Local::now().format("%Y-%m-%d").to_string();

                let mut fields = std::collections::HashMap::new();
                fields.insert("id".into(), serde_yaml::Value::String(id.clone()));
                fields.insert("type".into(), serde_yaml::Value::String("voice-trend".into()));
                fields.insert("voice_system".into(), serde_yaml::Value::Bool(true));
                fields.insert("speaker".into(), serde_yaml::Value::String(format!("\"[[{}]]\"", speaker)));
                fields.insert("created".into(), serde_yaml::Value::String(today));
                fields.insert("status".into(), serde_yaml::Value::String("unread".into()));

                let frontmatter = vault::Frontmatter { fields };
                let body = if intent.notes.is_empty() {
                    format!("# {}\n", intent.topic)
                } else {
                    format!("# {}\n\n{}\n", intent.topic, intent.notes)
                };

                let file_path = vault::get_voice_file_path(std::path::Path::new(voice_path), &file_type, &id, &intent.topic);
                vault::write_vault_file(&file_path, &frontmatter, &body).map_err(CommandError::from)?;
                dispatched += 1;
            }
            _ => continue,
        }
    }

    Ok(dispatched)
}

// --- Delete command ---

#[tauri::command]
pub fn delete_vault_file(
    settings: SettingsState<'_>,
    path: String,
) -> CommandResult<()> {
    let _ = get_vault_path(&settings)?;
    std::fs::remove_file(Path::new(&path))
        .map_err(|e| CommandError::from(format!("Failed to delete file: {}", e)))
}

// --- Publish draft command ---

#[tauri::command]
pub fn publish_draft(
    settings: SettingsState<'_>,
    path: String,
    publish_url: String,
    publish_platform: String,
) -> CommandResult<vault::VaultFile> {
    let _ = get_vault_path(&settings)?;
    let mut file = vault::read_vault_file(Path::new(&path)).map_err(CommandError::from)?;

    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    file.frontmatter.fields.insert("status".into(), serde_yaml::Value::String("published".into()));
    file.frontmatter.fields.insert("publish_url".into(), serde_yaml::Value::String(publish_url));
    file.frontmatter.fields.insert("publish_date".into(), serde_yaml::Value::String(today));
    file.frontmatter.fields.insert("publish_platform".into(), serde_yaml::Value::String(publish_platform));

    vault::write_vault_file(Path::new(&path), &file.frontmatter, &file.body)
        .map_err(CommandError::from)?;
    vault::read_vault_file(Path::new(&path)).map_err(CommandError::from)
}

// --- List all drafts across executives ---

#[derive(Debug, serde::Serialize)]
pub struct DraftWithExecutive {
    pub executive_name: String,
    pub file: vault::VaultFile,
}

#[tauri::command]
pub fn list_all_drafts(
    settings: SettingsState<'_>,
) -> CommandResult<Vec<DraftWithExecutive>> {
    let vault_path = get_vault_path(&settings)?;
    let executives = vault::discover_executives(Path::new(&vault_path))
        .map_err(CommandError::from)?;

    let mut all_drafts = Vec::new();
    for exec in executives {
        let drafts = vault::list_voice_files(
            Path::new(&exec.voice_path),
            Some(&vault::VoiceFileType::VoiceDraft),
        ).map_err(CommandError::from)?;

        for draft in drafts {
            all_drafts.push(DraftWithExecutive {
                executive_name: exec.name.clone(),
                file: draft,
            });
        }
    }

    // Sort by created date descending (newest first)
    all_drafts.sort_by(|a, b| {
        let a_date = a.file.frontmatter.get_string("created");
        let b_date = b.file.frontmatter.get_string("created");
        b_date.cmp(&a_date)
    });

    Ok(all_drafts)
}

// --- Voice health commands ---

#[derive(Debug, serde::Serialize)]
pub struct VoiceHealth {
    pub quotes: usize,
    pub has_kernel: bool,
    pub level: String, // "needs-material" | "building" | "ready"
    pub label: String,
    pub icon: String,
    pub last_refresh_quote_count: usize,
    pub quotes_since_refresh: usize,
}

#[tauri::command]
pub fn get_voice_health(
    settings: SettingsState<'_>,
    voice_path: String,
) -> CommandResult<VoiceHealth> {
    let _ = get_vault_path(&settings)?;
    let scoreboard = vault::get_scoreboard(Path::new(&voice_path))
        .map_err(CommandError::from)?;

    // Get last refresh count from settings
    let settings_key = format!("last_refresh_{}", voice_path.replace("/", "_"));
    let last_refresh_quote_count = settings
        .get(&settings_key)
        .and_then(|s| s.parse::<usize>().ok())
        .unwrap_or(0);

    let quotes_since_refresh = scoreboard.quotes.saturating_sub(last_refresh_quote_count);

    let (level, label, icon) = if scoreboard.quotes < 5 {
        ("needs-material".to_string(), "Needs material".to_string(), "🔴".to_string())
    } else if scoreboard.quotes < 20 || !scoreboard.has_kernel {
        ("building".to_string(), "Building".to_string(), "🟡".to_string())
    } else {
        ("ready".to_string(), "Ready".to_string(), "🟢".to_string())
    };

    Ok(VoiceHealth {
        quotes: scoreboard.quotes,
        has_kernel: scoreboard.has_kernel,
        level,
        label,
        icon,
        last_refresh_quote_count,
        quotes_since_refresh,
    })
}

#[tauri::command]
pub fn mark_voice_refreshed(
    settings: SettingsState<'_>,
    voice_path: String,
) -> CommandResult<()> {
    let _ = get_vault_path(&settings)?;
    let scoreboard = vault::get_scoreboard(Path::new(&voice_path))
        .map_err(CommandError::from)?;

    let settings_key = format!("last_refresh_{}", voice_path.replace("/", "_"));
    settings.set(&settings_key, &scoreboard.quotes.to_string())
        .map_err(CommandError::from)?;

    Ok(())
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
