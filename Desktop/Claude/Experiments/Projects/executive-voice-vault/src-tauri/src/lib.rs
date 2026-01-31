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
            // Anti-voice
            commands::create_anti_voice,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
