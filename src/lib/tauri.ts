import { invoke } from '@tauri-apps/api/core';
import type { AppSettings, Folder, ScanSummary, Track } from '../types/models';

export const tauriApi = {
  dbInit: () => invoke<void>('db_init'),
  selectFiles: () => invoke<string[]>('select_files'),
  selectFolder: () => invoke<string | null>('select_folder'),
  scanFolder: (path: string) => invoke<ScanSummary>('scan_folder', { path }),
  rescanLibrary: () => invoke<ScanSummary>('rescan_library'),
  loadTracks: () => invoke<Track[]>('load_tracks'),
  loadFolders: () => invoke<Folder[]>('load_folders'),
  addFolder: (path: string) => invoke<void>('add_folder', { path }),
  removeFolder: (path: string) => invoke<void>('remove_folder', { path }),
  toggleFavorite: (trackId: number, value: boolean) => invoke<void>('toggle_favorite', { trackId, value }),
  incrementPlay: (trackId: number) => invoke<void>('increment_play_count', { trackId }),
  saveSettings: (settings: AppSettings) => invoke<void>('save_settings', { settings }),
  loadSettings: () => invoke<AppSettings>('load_settings'),
  importFiles: (paths: string[]) => invoke<ScanSummary>('import_files', { paths }),
};
