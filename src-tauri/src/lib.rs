use std::fs;
use std::path::PathBuf;

use tauri::{AppHandle, Manager};

fn storage_file(app: &AppHandle, key: &str) -> Result<PathBuf, String> {
    if !key
        .chars()
        .all(|character| character.is_ascii_alphanumeric() || character == '-' || character == '_')
    {
        return Err("storage key contains unsupported characters".to_string());
    }

    let storage_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("storage");

    fs::create_dir_all(&storage_dir).map_err(|error| error.to_string())?;
    Ok(storage_dir.join(format!("{key}.json")))
}

#[tauri::command]
fn read_platform_storage(app: AppHandle, key: String) -> Result<Option<String>, String> {
    let path = storage_file(&app, &key)?;

    if !path.exists() {
        return Ok(None);
    }

    fs::read_to_string(path)
        .map(Some)
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn write_platform_storage(app: AppHandle, key: String, value: String) -> Result<(), String> {
    let path = storage_file(&app, &key)?;
    fs::write(path, value).map_err(|error| error.to_string())
}

#[tauri::command]
fn remove_platform_storage(app: AppHandle, key: String) -> Result<(), String> {
    let path = storage_file(&app, &key)?;

    if path.exists() {
        fs::remove_file(path).map_err(|error| error.to_string())?;
    }

    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            read_platform_storage,
            write_platform_storage,
            remove_platform_storage
        ])
        .run(tauri::generate_context!())
        .expect("error while running SyncHire");
}
