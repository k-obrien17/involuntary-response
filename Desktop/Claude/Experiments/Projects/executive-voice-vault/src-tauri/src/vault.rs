use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

/// Represents parsed YAML frontmatter from a markdown file
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Frontmatter {
    #[serde(flatten)]
    pub fields: HashMap<String, serde_yaml::Value>,
}

impl Frontmatter {
    pub fn get_str(&self, key: &str) -> Option<&str> {
        self.fields.get(key).and_then(|v| v.as_str())
    }

    pub fn get_string(&self, key: &str) -> String {
        self.get_str(key).unwrap_or("").to_string()
    }

    pub fn get_bool(&self, key: &str) -> bool {
        self.fields.get(key).and_then(|v| v.as_bool()).unwrap_or(false)
    }

    pub fn get_string_vec(&self, key: &str) -> Vec<String> {
        self.fields
            .get(key)
            .and_then(|v| v.as_sequence())
            .map(|seq| {
                seq.iter()
                    .filter_map(|v| v.as_str().map(|s| s.to_string()))
                    .collect()
            })
            .unwrap_or_default()
    }

    pub fn get_i64(&self, key: &str) -> Option<i64> {
        self.fields.get(key).and_then(|v| v.as_i64())
    }
}

/// A parsed markdown file with frontmatter and body
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultFile {
    pub path: String,
    pub filename: String,
    pub frontmatter: Frontmatter,
    pub body: String,
}

/// Voice file types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub enum VoiceFileType {
    VoiceQuote,
    VoicePrinciple,
    VoiceLexicon,
    VoiceStance,
    VoiceNarrative,
    VoiceKernel,
    VoiceIndex,
    VoiceAntivoice,
}

impl VoiceFileType {
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "voice-quote" => Some(Self::VoiceQuote),
            "voice-principle" => Some(Self::VoicePrinciple),
            "voice-lexicon" => Some(Self::VoiceLexicon),
            "voice-stance" => Some(Self::VoiceStance),
            "voice-narrative" => Some(Self::VoiceNarrative),
            "voice-kernel" => Some(Self::VoiceKernel),
            "voice-index" => Some(Self::VoiceIndex),
            "voice-antivoice" => Some(Self::VoiceAntivoice),
            _ => None,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            Self::VoiceQuote => "voice-quote",
            Self::VoicePrinciple => "voice-principle",
            Self::VoiceLexicon => "voice-lexicon",
            Self::VoiceStance => "voice-stance",
            Self::VoiceNarrative => "voice-narrative",
            Self::VoiceKernel => "voice-kernel",
            Self::VoiceIndex => "voice-index",
            Self::VoiceAntivoice => "voice-antivoice",
        }
    }

    pub fn subfolder(&self) -> &'static str {
        match self {
            Self::VoiceQuote => "Quotes",
            Self::VoicePrinciple => "Principles",
            Self::VoiceLexicon => "Lexicon",
            Self::VoiceStance => "Stances",
            Self::VoiceNarrative => "Narratives",
            Self::VoiceKernel => "",
            Self::VoiceIndex => "",
            Self::VoiceAntivoice => "Anti-Voice",
        }
    }

    pub fn id_prefix(&self) -> &'static str {
        match self {
            Self::VoiceQuote => "VQ",
            Self::VoicePrinciple => "VP",
            Self::VoiceLexicon => "VL",
            Self::VoiceStance => "VS",
            Self::VoiceNarrative => "VN",
            Self::VoiceKernel => "VK",
            Self::VoiceIndex => "",
            Self::VoiceAntivoice => "AV",
        }
    }
}

/// Executive info derived from vault folder structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultExecutive {
    pub name: String,
    pub voice_path: String,
    pub contact_path: String,
}

/// Summary stats for an executive's voice system
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceScoreboard {
    pub quotes: usize,
    pub principles: usize,
    pub lexicon: usize,
    pub stances: usize,
    pub narratives: usize,
    pub antivoice: usize,
    pub has_kernel: bool,
}

// --- Parsing ---

/// Parse a markdown file into frontmatter + body
pub fn parse_markdown(content: &str) -> (Frontmatter, String) {
    let trimmed = content.trim_start();
    if !trimmed.starts_with("---") {
        return (Frontmatter::default(), content.to_string());
    }

    // Find end of frontmatter
    let after_first = &trimmed[3..];
    if let Some(end_idx) = after_first.find("\n---") {
        let yaml_str = &after_first[..end_idx];
        let body_start = end_idx + 4; // skip "\n---"
        let body = after_first[body_start..].trim_start_matches('\n').to_string();

        let frontmatter: Frontmatter = serde_yaml::from_str(yaml_str).unwrap_or_default();
        (frontmatter, body)
    } else {
        (Frontmatter::default(), content.to_string())
    }
}

/// Serialize frontmatter + body back to markdown
pub fn serialize_markdown(frontmatter: &Frontmatter, body: &str) -> String {
    let yaml = serde_yaml::to_string(&frontmatter.fields).unwrap_or_default();
    format!("---\n{}---\n\n{}\n", yaml, body)
}

/// Read and parse a vault markdown file
pub fn read_vault_file(path: &Path) -> Result<VaultFile, String> {
    let content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;

    let (frontmatter, body) = parse_markdown(&content);
    let filename = path
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    Ok(VaultFile {
        path: path.to_string_lossy().to_string(),
        filename,
        frontmatter,
        body,
    })
}

/// Write a vault file (frontmatter + body) to disk
pub fn write_vault_file(path: &Path, frontmatter: &Frontmatter, body: &str) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directory {}: {}", parent.display(), e))?;
    }
    let content = serialize_markdown(frontmatter, body);
    fs::write(path, content)
        .map_err(|e| format!("Failed to write {}: {}", path.display(), e))
}

// --- Discovery ---

/// Find all Voice folders in the vault (folders containing voice_system files)
pub fn discover_executives(vault_path: &Path) -> Result<Vec<VaultExecutive>, String> {
    let mut executives = Vec::new();
    let mut seen_paths = std::collections::HashSet::new();

    for entry in WalkDir::new(vault_path)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        if path.is_dir() && path.file_name().map(|f| f == "Voice").unwrap_or(false) {
            let voice_path = path.to_string_lossy().to_string();
            if seen_paths.contains(&voice_path) {
                continue;
            }
            seen_paths.insert(voice_path.clone());

            // Extract executive name from parent path: .../Contacts/{Name}/Voice
            if let Some(contact_dir) = path.parent() {
                let name = contact_dir
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();
                let contact_path = contact_dir.to_string_lossy().to_string();

                // Verify this is actually a voice system folder by checking for subdirs or voice files
                let has_voice_content = path.join("Quotes").exists()
                    || WalkDir::new(path)
                        .max_depth(2)
                        .into_iter()
                        .filter_map(|e| e.ok())
                        .any(|e| {
                            e.path().extension().map(|ext| ext == "md").unwrap_or(false)
                        });

                if has_voice_content {
                    executives.push(VaultExecutive {
                        name,
                        voice_path,
                        contact_path,
                    });
                }
            }
        }
    }

    executives.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(executives)
}

/// List all voice files of a given type for an executive
pub fn list_voice_files(
    voice_path: &Path,
    file_type: Option<&VoiceFileType>,
) -> Result<Vec<VaultFile>, String> {
    let mut files = Vec::new();

    for entry in WalkDir::new(voice_path)
        .follow_links(true)
        .max_depth(3)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        if !path.is_file() || path.extension().map(|e| e != "md").unwrap_or(true) {
            continue;
        }

        match read_vault_file(path) {
            Ok(vf) => {
                if !vf.frontmatter.get_bool("voice_system") {
                    continue;
                }
                if let Some(ft) = file_type {
                    let file_type_str = vf.frontmatter.get_string("type");
                    if file_type_str != ft.as_str() {
                        continue;
                    }
                }
                files.push(vf);
            }
            Err(_) => continue,
        }
    }

    // Sort by ID (which embeds date)
    files.sort_by(|a, b| {
        let a_id = a.frontmatter.get_string("id");
        let b_id = b.frontmatter.get_string("id");
        a_id.cmp(&b_id)
    });

    Ok(files)
}

/// Get the scoreboard for an executive's voice system
pub fn get_scoreboard(voice_path: &Path) -> Result<VoiceScoreboard, String> {
    let all_files = list_voice_files(voice_path, None)?;

    let mut scoreboard = VoiceScoreboard {
        quotes: 0,
        principles: 0,
        lexicon: 0,
        stances: 0,
        narratives: 0,
        antivoice: 0,
        has_kernel: false,
    };

    for file in &all_files {
        match file.frontmatter.get_str("type") {
            Some("voice-quote") => scoreboard.quotes += 1,
            Some("voice-principle") => scoreboard.principles += 1,
            Some("voice-lexicon") => scoreboard.lexicon += 1,
            Some("voice-stance") => scoreboard.stances += 1,
            Some("voice-narrative") => scoreboard.narratives += 1,
            Some("voice-antivoice") => scoreboard.antivoice += 1,
            Some("voice-kernel") => scoreboard.has_kernel = true,
            _ => {}
        }
    }

    Ok(scoreboard)
}

/// Generate the next available ID for a given voice file type
pub fn generate_next_id(voice_path: &Path, file_type: &VoiceFileType) -> Result<String, String> {
    let today = chrono::Local::now().format("%Y%m%d").to_string();
    let prefix = file_type.id_prefix();

    let existing = list_voice_files(voice_path, Some(file_type))?;

    // Find max sequence number for today
    let today_prefix = format!("{}-{}-", prefix, today);
    let max_seq = existing
        .iter()
        .filter_map(|f| {
            let id = f.frontmatter.get_string("id");
            if id.starts_with(&today_prefix) {
                id.rsplit('-').next()?.parse::<u32>().ok()
            } else {
                None
            }
        })
        .max()
        .unwrap_or(0);

    Ok(format!("{}-{}-{:03}", prefix, today, max_seq + 1))
}

/// Get the path where a new voice file should be written
pub fn get_voice_file_path(
    voice_path: &Path,
    file_type: &VoiceFileType,
    id: &str,
    title: &str,
) -> PathBuf {
    let subfolder = file_type.subfolder();
    let sanitized_title = sanitize_filename(title);
    let filename = format!("{} - {}.md", id, sanitized_title);

    if subfolder.is_empty() {
        voice_path.join(filename)
    } else {
        voice_path.join(subfolder).join(filename)
    }
}

fn sanitize_filename(s: &str) -> String {
    s.chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '-',
            _ => c,
        })
        .collect::<String>()
        .trim()
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_markdown() {
        let content = "---\nid: VQ-20250901-001\ntype: voice-quote\nvoice_system: true\n---\n\n# Title\n\nBody text";
        let (fm, body) = parse_markdown(content);
        assert_eq!(fm.get_string("id"), "VQ-20250901-001");
        assert_eq!(fm.get_string("type"), "voice-quote");
        assert!(fm.get_bool("voice_system"));
        assert!(body.starts_with("# Title"));
    }

    #[test]
    fn test_roundtrip() {
        let content = "---\nid: VQ-20250901-001\ntype: voice-quote\n---\n\n# Hello\n\nWorld\n";
        let (fm, body) = parse_markdown(content);
        let out = serialize_markdown(&fm, &body);
        let (fm2, body2) = parse_markdown(&out);
        assert_eq!(fm2.get_string("id"), "VQ-20250901-001");
        assert!(body2.contains("# Hello"));
    }
}
