use anyhow::Context;
use chrono::Utc;
use lofty::file::{AudioFile, TaggedFileExt};
use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use sqlx::{sqlite::SqlitePoolOptions, Pool, Row, Sqlite};
use std::{collections::HashSet, path::Path, sync::{Arc, Mutex}};
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;
use walkdir::WalkDir;

const SUPPORTED_EXT: &[&str] = &["mp3", "flac", "wav", "ogg", "aac", "m4a"];

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FileInfo {
    path: String,
    size_bytes: i64,
    modified_at: String,
    extension: String,
    exists: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MetadataInfo {
    title: String,
    artist: String,
    album: String,
    duration_seconds: Option<f64>,
    track_number: Option<u32>,
}

#[derive(Clone)]
struct AppState {
    db: Pool<Sqlite>,
    watchers: Arc<Mutex<Vec<RecommendedWatcher>>>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
struct Track {
    id: i64,
    path: String,
    filename: String,
    title: String,
    artist: String,
    album: String,
    duration_seconds: Option<f64>,
    size_bytes: i64,
    extension: String,
    added_at: String,
    modified_at: String,
    play_count: i64,
    last_played_at: Option<String>,
    is_favorite: bool,
    is_missing: bool,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
struct Folder {
    id: i64,
    path: String,
    created_at: String,
    last_scanned_at: Option<String>,
    is_active: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ScanSummary {
    imported: i64,
    marked_missing: i64,
    updated: i64,
    unsupported: i64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppSettings {
    volume: f64,
    muted: bool,
    repeat_mode: String,
    shuffle: bool,
    last_track_id: Option<i64>,
    last_position: f64,
}

async fn init_db(pool: &Pool<Sqlite>) -> anyhow::Result<()> {
    let schema = include_str!("schema.sql");
    for stmt in schema.split(";") {
        let q = stmt.trim();
        if !q.is_empty() {
            sqlx::query(q).execute(pool).await?;
        }
    }
    Ok(())
}

fn parse_artist_title(filename: &str) -> (String, String) {
    if let Some((artist, title)) = filename.split_once(" - ") {
        (artist.trim().to_string(), title.trim().to_string())
    } else {
        ("Unknown Artist".to_string(), filename.to_string())
    }
}

async fn import_single_path(path: &str, pool: &Pool<Sqlite>) -> anyhow::Result<(bool, bool)> {
    let p = Path::new(path);
    let ext = p.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
    if !SUPPORTED_EXT.contains(&ext.as_str()) {
        return Ok((false, true));
    }

    let metadata = std::fs::metadata(p).context("reading metadata")?;
    let modified = metadata.modified().ok().and_then(|m| m.elapsed().ok()).map(|_| Utc::now().to_rfc3339()).unwrap_or_else(|| Utc::now().to_rfc3339());
    let filename = p.file_stem().and_then(|v| v.to_str()).unwrap_or("Unknown").to_string();
    let mut title = filename.clone();
    let mut artist = "Unknown Artist".to_string();
    let mut album = "Unknown Album".to_string();
    let mut duration: Option<f64> = None;

    if let Ok(tagged) = lofty::read_from_path(p) {
        duration = Some(tagged.properties().duration().as_secs_f64());
        if let Some(tag) = tagged.primary_tag().or_else(|| tagged.first_tag()) {
            if let Some(v) = tag.title() { title = v.to_string(); }
            if let Some(v) = tag.artist() { artist = v.to_string(); }
            if let Some(v) = tag.album() { album = v.to_string(); }
        }
    }

    if artist == "Unknown Artist" || title == filename {
        let (a, t) = parse_artist_title(&filename);
        if artist == "Unknown Artist" { artist = a; }
        if title == filename { title = t; }
    }

    let now = Utc::now().to_rfc3339();
    sqlx::query(
        "INSERT INTO tracks (path, filename, title, artist, album, duration_seconds, size_bytes, extension, added_at, modified_at, play_count, is_favorite, is_missing)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 0, 0, 0)
         ON CONFLICT(path) DO UPDATE SET filename=excluded.filename, title=excluded.title, artist=excluded.artist, album=excluded.album,
         duration_seconds=excluded.duration_seconds, size_bytes=excluded.size_bytes, extension=excluded.extension, modified_at=excluded.modified_at, is_missing=0"
    )
    .bind(path)
    .bind(filename)
    .bind(title)
    .bind(artist)
    .bind(album)
    .bind(duration)
    .bind(metadata.len() as i64)
    .bind(ext)
    .bind(now)
    .bind(modified)
    .execute(pool)
    .await?;

    Ok((true, false))
}

#[tauri::command]
async fn db_init(state: tauri::State<'_, AppState>) -> Result<(), String> {
    init_db(&state.db).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_file_info(path: String) -> Result<FileInfo, String> {
    let p = Path::new(&path);
    let ext = p.extension().and_then(|e| e.to_str()).unwrap_or("").to_string();
    match std::fs::metadata(p) {
        Ok(meta) => Ok(FileInfo {
            path,
            size_bytes: meta.len() as i64,
            modified_at: Utc::now().to_rfc3339(),
            extension: ext,
            exists: true,
        }),
        Err(_) => Ok(FileInfo {
            path,
            size_bytes: 0,
            modified_at: Utc::now().to_rfc3339(),
            extension: ext,
            exists: false,
        }),
    }
}

#[tauri::command]
async fn read_metadata(path: String) -> Result<MetadataInfo, String> {
    let p = Path::new(&path);
    let fallback = p
        .file_stem()
        .and_then(|v| v.to_str())
        .unwrap_or("Unknown")
        .to_string();
    let (mut artist, mut title) = parse_artist_title(&fallback);
    let mut album = "Unknown Album".to_string();
    let mut duration = None;
    let mut track_number = None;

    if let Ok(tagged) = lofty::read_from_path(p) {
        duration = Some(tagged.properties().duration().as_secs_f64());
        if let Some(tag) = tagged.primary_tag().or_else(|| tagged.first_tag()) {
            if let Some(v) = tag.title() {
                title = v.to_string();
            }
            if let Some(v) = tag.artist() {
                artist = v.to_string();
            }
            if let Some(v) = tag.album() {
                album = v.to_string();
            }
            track_number = tag.track();
        }
    }

    Ok(MetadataInfo {
        title,
        artist,
        album,
        duration_seconds: duration,
        track_number,
    })
}

#[tauri::command]
fn select_files(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let files = app.dialog().file().add_filter("Audio", &["mp3", "flac", "wav", "ogg", "aac", "m4a"]).blocking_pick_files();
    Ok(files.unwrap_or_default().into_iter().filter_map(|f| f.into_path().ok()).map(|p| p.to_string_lossy().to_string()).collect())
}

#[tauri::command]
fn select_folder(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let folder = app.dialog().file().blocking_pick_folder();
    Ok(folder.and_then(|f| f.into_path().ok()).map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
async fn add_folder(path: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    sqlx::query("INSERT OR IGNORE INTO folders(path, created_at, is_active) VALUES (?1, ?2, 1)")
      .bind(path)
      .bind(Utc::now().to_rfc3339())
      .execute(&state.db).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn remove_folder(path: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    sqlx::query("UPDATE folders SET is_active=0 WHERE path=?1").bind(path).execute(&state.db).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn import_files(paths: Vec<String>, state: tauri::State<'_, AppState>) -> Result<ScanSummary, String> {
    let mut summary = ScanSummary { imported: 0, marked_missing: 0, updated: 0, unsupported: 0 };
    for p in paths {
        match import_single_path(&p, &state.db).await {
            Ok((true, false)) => summary.imported += 1,
            Ok((_, true)) => summary.unsupported += 1,
            Err(_) => summary.updated += 0,
        }
    }
    Ok(summary)
}

#[tauri::command]
async fn scan_folder(path: String, state: tauri::State<'_, AppState>) -> Result<ScanSummary, String> {
    let mut summary = ScanSummary { imported: 0, marked_missing: 0, updated: 0, unsupported: 0 };
    let mut seen = HashSet::new();

    for entry in WalkDir::new(&path).into_iter().filter_map(Result::ok).filter(|e| e.file_type().is_file()) {
        let p = entry.path().to_string_lossy().to_string();
        seen.insert(p.clone());
        match import_single_path(&p, &state.db).await {
            Ok((true, false)) => summary.imported += 1,
            Ok((_, true)) => summary.unsupported += 1,
            Err(_) => {}
        }
    }

    let rows = sqlx::query("SELECT id, path FROM tracks").fetch_all(&state.db).await.map_err(|e| e.to_string())?;
    for row in rows {
        let id: i64 = row.get("id");
        let p: String = row.get("path");
        if p.starts_with(&path) && !seen.contains(&p) {
            sqlx::query("UPDATE tracks SET is_missing=1 WHERE id=?1").bind(id).execute(&state.db).await.map_err(|e| e.to_string())?;
            summary.marked_missing += 1;
        }
    }

    sqlx::query("UPDATE folders SET last_scanned_at=?1 WHERE path=?2").bind(Utc::now().to_rfc3339()).bind(path).execute(&state.db).await.map_err(|e| e.to_string())?;
    Ok(summary)
}

#[tauri::command]
async fn rescan_library(state: tauri::State<'_, AppState>) -> Result<ScanSummary, String> {
    let folders = sqlx::query("SELECT path FROM folders WHERE is_active=1").fetch_all(&state.db).await.map_err(|e| e.to_string())?;
    let mut total = ScanSummary { imported: 0, marked_missing: 0, updated: 0, unsupported: 0 };
    for f in folders {
        let path: String = f.get("path");
        let r = scan_folder(path, state.clone()).await?;
        total.imported += r.imported;
        total.marked_missing += r.marked_missing;
        total.updated += r.updated;
        total.unsupported += r.unsupported;
    }
    Ok(total)
}

#[tauri::command]
async fn load_tracks(state: tauri::State<'_, AppState>) -> Result<Vec<Track>, String> {
    sqlx::query_as::<_, Track>("SELECT id, path, filename, title, artist, album, duration_seconds, size_bytes, extension, added_at, modified_at, play_count, last_played_at, is_favorite, is_missing FROM tracks ORDER BY added_at DESC")
      .fetch_all(&state.db).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn load_folders(state: tauri::State<'_, AppState>) -> Result<Vec<Folder>, String> {
    sqlx::query_as::<_, Folder>("SELECT id, path, created_at, last_scanned_at, is_active FROM folders WHERE is_active=1 ORDER BY created_at DESC")
      .fetch_all(&state.db).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn toggle_favorite(track_id: i64, value: bool, state: tauri::State<'_, AppState>) -> Result<(), String> {
    sqlx::query("UPDATE tracks SET is_favorite=?1 WHERE id=?2").bind(value).bind(track_id).execute(&state.db).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn increment_play_count(track_id: i64, state: tauri::State<'_, AppState>) -> Result<(), String> {
    sqlx::query("UPDATE tracks SET play_count=play_count+1, last_played_at=?1 WHERE id=?2").bind(Utc::now().to_rfc3339()).bind(track_id).execute(&state.db).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn save_settings(settings: AppSettings, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let pairs = vec![
        ("volume", settings.volume.to_string()),
        ("muted", settings.muted.to_string()),
        ("repeat_mode", settings.repeat_mode),
        ("shuffle", settings.shuffle.to_string()),
        ("last_track_id", settings.last_track_id.map(|v| v.to_string()).unwrap_or_default()),
        ("last_position", settings.last_position.to_string()),
    ];
    for (k, v) in pairs {
        sqlx::query("INSERT INTO app_settings(key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
          .bind(k)
          .bind(v)
          .execute(&state.db).await.map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn load_settings(state: tauri::State<'_, AppState>) -> Result<AppSettings, String> {
    let rows = sqlx::query("SELECT key, value FROM app_settings").fetch_all(&state.db).await.map_err(|e| e.to_string())?;
    let mut settings = AppSettings { volume: 0.8, muted: false, repeat_mode: "off".into(), shuffle: false, last_track_id: None, last_position: 0.0 };
    for row in rows {
        let k: String = row.get("key");
        let v: String = row.get("value");
        match k.as_str() {
            "volume" => settings.volume = v.parse().unwrap_or(0.8),
            "muted" => settings.muted = v == "true",
            "repeat_mode" => settings.repeat_mode = v,
            "shuffle" => settings.shuffle = v == "true",
            "last_track_id" => settings.last_track_id = v.parse().ok(),
            "last_position" => settings.last_position = v.parse().unwrap_or(0.0),
            _ => {}
        }
    }
    Ok(settings)
}

#[tauri::command]
async fn watch_folders(app: tauri::AppHandle, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let folders = sqlx::query("SELECT path FROM folders WHERE is_active=1").fetch_all(&state.db).await.map_err(|e| e.to_string())?;
    let mut guard = state.watchers.lock().map_err(|_| "watcher lock")?;
    guard.clear();

    for row in folders {
        let path: String = row.get("path");
        let app_handle = app.clone();
        let mut watcher = notify::recommended_watcher(move |res: notify::Result<notify::Event>| {
            if let Ok(event) = res {
                let _ = app_handle.emit("library://folder-change", serde_json::json!({"paths": event.paths}));
            }
        }).map_err(|e| e.to_string())?;
        watcher.watch(Path::new(&path), RecursiveMode::Recursive).map_err(|e| e.to_string())?;
        guard.push(watcher);
    }
    Ok(())
}

#[tauri::command]
async fn stop_watchers(state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.watchers.lock().map_err(|_| "watcher lock")?.clear();
    Ok(())
}

pub fn run() {
    tauri::async_runtime::block_on(async {
        let app_dir = std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
        let db_path = app_dir.join("echo.db");
        let url = format!("sqlite://{}", db_path.to_string_lossy());
        let db = SqlitePoolOptions::new().max_connections(4).connect(&url).await.expect("db connect");
        init_db(&db).await.expect("db init");

        tauri::Builder::default()
            .plugin(tauri_plugin_dialog::init())
            .plugin(tauri_plugin_fs::init())
            .manage(AppState { db, watchers: Arc::new(Mutex::new(vec![])) })
            .invoke_handler(tauri::generate_handler![
                db_init,
                select_files,
                select_folder,
                add_folder,
                remove_folder,
                import_files,
                scan_folder,
                rescan_library,
                load_tracks,
                load_folders,
                toggle_favorite,
                increment_play_count,
                save_settings,
                load_settings,
                read_metadata,
                get_file_info,
                watch_folders,
                stop_watchers
            ])
            .run(tauri::generate_context!())
            .expect("error while running tauri app");
    });
}
