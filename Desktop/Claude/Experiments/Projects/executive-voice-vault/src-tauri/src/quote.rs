use std::collections::HashMap;
use std::path::Path;

use crate::vault::*;

/// Input for creating a new voice quote
#[derive(Debug, Clone, serde::Deserialize)]
pub struct CreateQuoteInput {
    pub organizing_question: String,
    pub verbatim_quote: String,
    pub source: String,
    pub source_type: String,
    pub date_spoken: String,
    pub title: String,
    pub topics: Vec<String>,
    pub confidence: String,
}

/// Create a new VQ file in the executive's Voice/Quotes folder
pub fn create_quote(
    voice_path: &Path,
    speaker: &str,
    input: &CreateQuoteInput,
) -> Result<VaultFile, String> {
    let file_type = VoiceFileType::VoiceQuote;
    let id = generate_next_id(voice_path, &file_type)?;
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    let mut fields = HashMap::new();
    fields.insert("id".into(), serde_yaml::Value::String(id.clone()));
    fields.insert("type".into(), serde_yaml::Value::String("voice-quote".into()));
    fields.insert("voice_system".into(), serde_yaml::Value::Bool(true));
    fields.insert("status".into(), serde_yaml::Value::String("capture".into()));
    fields.insert(
        "speaker".into(),
        serde_yaml::Value::String(format!("\"[[{}]]\"", speaker)),
    );
    fields.insert("source".into(), serde_yaml::Value::String(input.source.clone()));
    fields.insert("source_type".into(), serde_yaml::Value::String(input.source_type.clone()));
    fields.insert("date_spoken".into(), serde_yaml::Value::String(input.date_spoken.clone()));
    fields.insert(
        "organizing_question".into(),
        serde_yaml::Value::String(input.organizing_question.clone()),
    );
    fields.insert(
        "topics".into(),
        serde_yaml::Value::Sequence(
            input
                .topics
                .iter()
                .map(|t| serde_yaml::Value::String(t.clone()))
                .collect(),
        ),
    );
    fields.insert(
        "confidence".into(),
        serde_yaml::Value::String(
            if input.confidence.is_empty() {
                "high".into()
            } else {
                input.confidence.clone()
            },
        ),
    );
    fields.insert("created".into(), serde_yaml::Value::String(today));
    fields.insert("last_reviewed".into(), serde_yaml::Value::Null);

    let frontmatter = Frontmatter { fields };

    let body = format!(
        r#"# {}

## Verbatim quote
> {}

> — {} ({})

## Context
- {}

## Voice signals
- Cadence:
- Tone:
- Notable phrasing:

## Evidence links
- Supports principle:
- Supports lexicon:
- Supports stance:

## Usage
- Reusable in: drafts, briefs, outlines
- Best for:"#,
        input.title,
        input.verbatim_quote,
        input.source,
        input.date_spoken,
        input.organizing_question,
    );

    let file_path = get_voice_file_path(voice_path, &file_type, &id, &input.title);
    write_vault_file(&file_path, &frontmatter, &body)?;

    read_vault_file(&file_path)
}

/// Read the Voice Kernel for an executive
pub fn get_voice_kernel(voice_path: &Path) -> Result<Option<VaultFile>, String> {
    let files = list_voice_files(Path::new(voice_path), Some(&VoiceFileType::VoiceKernel))?;
    Ok(files.into_iter().next())
}
