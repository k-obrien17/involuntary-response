use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize, Default)]
struct SettingsData {
    #[serde(flatten)]
    values: HashMap<String, String>,
}

pub struct Settings {
    path: PathBuf,
    data: Mutex<SettingsData>,
}

impl Settings {
    pub fn new() -> Result<Self, String> {
        let path = get_settings_path();
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create settings dir: {}", e))?;
        }

        let data = if path.exists() {
            let content = fs::read_to_string(&path)
                .map_err(|e| format!("Failed to read settings: {}", e))?;
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            SettingsData::default()
        };

        Ok(Settings {
            path,
            data: Mutex::new(data),
        })
    }

    pub fn get(&self, key: &str) -> Option<String> {
        let data = self.data.lock().unwrap();
        data.values.get(key).cloned()
    }

    pub fn set(&self, key: &str, value: &str) -> Result<(), String> {
        let mut data = self.data.lock().unwrap();
        data.values.insert(key.to_string(), value.to_string());
        let json = serde_json::to_string_pretty(&*data)
            .map_err(|e| format!("Failed to serialize settings: {}", e))?;
        fs::write(&self.path, json)
            .map_err(|e| format!("Failed to write settings: {}", e))?;
        Ok(())
    }
}

fn get_settings_path() -> PathBuf {
    let mut path = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("executive-voice-vault");
    path.push("settings.json");
    path
}
