# Echo (Tauri 2 + React + TypeScript)

Echo is a lightweight local desktop music player foundation focused on Windows-first offline usage.

## What's implemented

### Complete foundations
- Tauri 2 + React + Vite + TypeScript + Tailwind setup.
- Modular frontend architecture (`app`, `features`, `store`, `hooks`, `lib`, `types`).
- SQLite schema + initialization for tracks/folders/playlists/history/settings.
- Rust commands for selecting files/folders, importing/scanning, rescan, loading tracks/folders, favorites/play count, settings persistence.
- HTML5 audio playback engine with queue, next/previous, volume, mute, shuffle, repeat, keyboard shortcuts.
- Library view with search/filter and double-click play.
- Settings view for watched folders and rescans.
- Now Playing right drawer scaffold with metadata panel.

### Real scaffolds/placeholders
- Playlists screen currently exposes smart-playlist cards as scaffold (manual playlist CRUD and reordering are next).
- Folder watcher command is implemented natively and emits events; frontend auto-reconcile loop is prepared for next phase.
- Artwork extraction + unsupported format UX messaging are basic and can be refined in phase polish.

## Run locally

### Prereqs
- Node 20+
- Rust stable toolchain
- Tauri prerequisites for your OS

### Install
```bash
npm install
```

### Dev
```bash
npm run tauri dev
```

### Build desktop app
```bash
npm run tauri build
```

## Project layout

- `src/app`: app shell, layout, global styles
- `src/features/library`: library table/search/import flow
- `src/features/player`: player bar controls
- `src/features/playlists`: playlists screens
- `src/features/settings`: settings management
- `src/features/now-playing`: right-side now playing panel
- `src/store`: Zustand app state for library/player
- `src/hooks`: audio engine and reusable hooks
- `src/lib`: Tauri invoke wrappers
- `src/types`: shared TS models
- `src-tauri/src`: Rust commands, DB, scanner, watchers

## Notes
- Echo intentionally avoids Spotify-like branding/layout and focuses on local ownership.
- The architecture is designed for future playback engine replacement.
- Unsupported files are skipped during import and counted in scan summary.
