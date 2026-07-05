use tauri_plugin_fs::FsExt;
use std::fs::OpenOptions;
use std::io::Write;
use std::path::Path;
use std::fs;

// Writes continuous slider samples to ratings.csv.
// Header does not include saveFolder — it is redundant with the directory path.
#[tauri::command]
fn write_csv_ratings(path: String, contents: Vec<String>) -> Result<(), String> {
    let file_exists = Path::new(&path).exists();

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|e| e.to_string())?;

    if !file_exists {
        writeln!(
            file,
            "SubID,PartnerID,dyad,computer,subjectInitials,raName,sessionTime,sessionDate,\
timestamp,taskOrder,Rating,EmoRating,EmoRating_Person,Time,stopTime,Movietime,\
Shift,Description,trialNumber,softwareVersion"
        )
        .map_err(|e| e.to_string())?;
    }

    for line in contents {
        writeln!(file, "{}", line).map_err(|e| e.to_string())?;
    }
    Ok(())
}

// Writes classification-task responses to transitions.csv.
#[tauri::command]
fn write_csv_transitions(path: String, contents: Vec<String>) -> Result<(), String> {
    let file_exists = Path::new(&path).exists();

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|e| e.to_string())?;

    if !file_exists {
        writeln!(
            file,
            "dyadId,participantId,partnerId,computer,subjectInitials,raName,sessionTime,\
sessionDate,sessionTimestamp,ratingTask,subTask,emotion1,emotion2,ratingPerson,\
response,trialNumber,softwareVersion"
        )
        .map_err(|e| e.to_string())?;
    }

    for line in contents {
        writeln!(file, "{}", line).map_err(|e| e.to_string())?;
    }
    Ok(())
}

// Exits the process. The frontend flushes any buffered data before calling this,
// so it does no saving itself. This is the only sanctioned way to quit the app
// (triggered by the researcher save-and-quit gate); it uses app.exit, which
// bypasses the CloseRequested guard installed in `run`.
#[tauri::command]
fn exit_app(app: tauri::AppHandle) {
    app.exit(0);
}

// ---- Round-robin tracking store ----
//
// One JSON file in the app-data directory holds the cross-day round-robin
// state (participants, groups, which pairs have met). It contains participant
// emails, so it must stay on the lab machine / UW Research Drive and is never
// part of the repo. The frontend owns the schema; these commands only move
// bytes.

fn roundrobin_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    use tauri::Manager;
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("roundrobin.json"))
}

// Returns the stored JSON, or "" when no store exists yet.
#[tauri::command]
fn load_roundrobin(app: tauri::AppHandle) -> Result<String, String> {
    let path = roundrobin_path(&app)?;
    if !path.exists() {
        return Ok(String::new());
    }
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_roundrobin(app: tauri::AppHandle, contents: String) -> Result<String, String> {
    let path = roundrobin_path(&app)?;
    fs::write(&path, contents).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

// Creates the session folder and returns its absolute path.
#[tauri::command]
fn setup_rating_directory(
    base_path: String,
    dyad_id: String,
    participant_id: String,
    partner_id: String,
    initials: String,
) -> Result<String, String> {
    let dyad_folder = format!(
        "{}/{}_{}_{}_{}",
        base_path, dyad_id, participant_id, partner_id, initials
    );
    fs::create_dir_all(&dyad_folder).map_err(|e| e.to_string())?;
    Ok(dyad_folder)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use tauri_plugin_global_shortcut::{Code, Modifiers, ShortcutState};

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        // Researcher save-and-quit combo registered at the OS level. The old
        // webview keydown listener only fired when the page had keyboard
        // focus, which a fullscreen kiosk often does not — that is why
        // Ctrl+Shift+Q felt unreliable. A global shortcut fires regardless of
        // focus; the frontend keydown handler remains as a fallback.
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state == ShortcutState::Pressed
                        && (shortcut.matches(Modifiers::CONTROL | Modifiers::SHIFT, Code::KeyQ)
                            || shortcut.matches(Modifiers::SUPER | Modifiers::SHIFT, Code::KeyQ))
                    {
                        use tauri::Emitter;
                        let _ = app.emit("admin-quit", ());
                    }
                })
                .build(),
        )
        .setup(|app| {
            let scope = app.fs_scope();
            let _ = scope.allow_directory("/", false);
            use tauri::Manager;

            // Register Ctrl+Shift+Q (and Cmd+Shift+Q on macOS). Failure is
            // non-fatal — the in-page keydown listener still works.
            {
                use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};
                let ctrl = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyQ);
                if let Err(e) = app.global_shortcut().register(ctrl) {
                    eprintln!("global shortcut (ctrl+shift+q) registration failed: {e}");
                }
                #[cfg(target_os = "macos")]
                {
                    let cmd = Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyQ);
                    if let Err(e) = app.global_shortcut().register(cmd) {
                        eprintln!("global shortcut (cmd+shift+q) registration failed: {e}");
                    }
                }
            }

            let window = app.get_webview_window("main").unwrap();
            window.set_fullscreen(true).unwrap();
            let _ = window.set_always_on_top(true);

            // Block all OS-level window close attempts (Alt+F4, window close
            // button). The only sanctioned exit is the researcher save-and-quit
            // flow, which calls `exit_app` (app.exit) and bypasses this guard.
            window.on_window_event(|event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            write_csv_ratings,
            write_csv_transitions,
            setup_rating_directory,
            exit_app,
            load_roundrobin,
            save_roundrobin
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
