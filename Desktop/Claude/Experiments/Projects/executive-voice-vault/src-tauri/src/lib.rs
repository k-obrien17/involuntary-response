pub mod ai;
mod commands;
pub mod derive;
pub mod quote;
pub mod settings;
pub mod vault;

use settings::Settings;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let settings = Settings::new().expect("Failed to initialize settings");

    tauri::Builder::default()
        .manage(settings)
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Vault commands
            commands::list_executives,
            commands::get_voice_scoreboard,
            commands::list_voice_files,
            commands::get_voice_kernel,
            commands::create_quote,
            commands::list_quotes,
            commands::read_vault_file,
            // Derivation commands
            commands::get_derivation_context,
            commands::write_derived_file,
            // Settings + AI
            commands::get_setting,
            commands::set_setting,
            commands::generate_with_claude,
            commands::generate_with_claude_stream,
            // Trends
            commands::create_trend,
            commands::update_trend_status,
            // Drafts
            commands::create_draft_placeholder,
            commands::update_file_status,
            commands::update_file_body,
            commands::delete_vault_file,
            commands::publish_draft,
            commands::list_all_drafts,
            // Anti-voice
            commands::create_anti_voice,
            commands::get_anti_voice_context,
            // Voice health
            commands::get_voice_health,
            commands::mark_voice_refreshed,
            // Key facts
            commands::create_keyfact,
            commands::list_keyfacts,
            // Voice intake
            commands::transcribe_and_parse,
            commands::parse_transcript,
            commands::dispatch_voice_intents,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
