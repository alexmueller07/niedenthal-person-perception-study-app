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
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let scope = app.fs_scope();
            let _ = scope.allow_directory("/", false);
            use tauri::Manager;
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
            exit_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
