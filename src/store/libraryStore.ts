import { create } from 'zustand';
import { tauriApi } from '../lib/tauri';
import type { Folder, ScanSummary, SyncStatus, Track } from '../types/models';

interface LibraryState {
  tracks: Track[];
  folders: Folder[];
  syncStatus: SyncStatus;
  query: string;
  selectedTrackIds: number[];
  initialize: () => Promise<void>;
  refreshTracks: () => Promise<void>;
  refreshFolders: () => Promise<void>;
  importFiles: () => Promise<ScanSummary | null>;
  addFolder: () => Promise<void>;
  removeFolder: (path: string) => Promise<void>;
  rescan: () => Promise<void>;
  setQuery: (query: string) => void;
  toggleSelectTrack: (id: number) => void;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  tracks: [],
  folders: [],
  syncStatus: { running: false, lastScanAt: null, message: 'Idle' },
  query: '',
  selectedTrackIds: [],
  async initialize() {
    await tauriApi.dbInit();
    await Promise.all([get().refreshTracks(), get().refreshFolders()]);
  },
  async refreshTracks() {
    const tracks = await tauriApi.loadTracks();
    set({ tracks });
  },
  async refreshFolders() {
    const folders = await tauriApi.loadFolders();
    set({ folders });
  },
  async importFiles() {
    const paths = await tauriApi.selectFiles();
    if (!paths?.length) return null;
    set({ syncStatus: { running: true, lastScanAt: new Date().toISOString(), message: 'Importing files…' } });
    const summary = await tauriApi.importFiles(paths);
    await get().refreshTracks();
    set({ syncStatus: { running: false, lastScanAt: new Date().toISOString(), message: 'Import complete' } });
    return summary;
  },
  async addFolder() {
    const folder = await tauriApi.selectFolder();
    if (!folder) return;
    await tauriApi.addFolder(folder);
    set({ syncStatus: { running: true, lastScanAt: new Date().toISOString(), message: 'Scanning folder…' } });
    await tauriApi.scanFolder(folder);
    await Promise.all([get().refreshTracks(), get().refreshFolders()]);
    set({ syncStatus: { running: false, lastScanAt: new Date().toISOString(), message: 'Folder synced' } });
  },
  async removeFolder(path) {
    await tauriApi.removeFolder(path);
    await get().refreshFolders();
  },
  async rescan() {
    set({ syncStatus: { running: true, lastScanAt: new Date().toISOString(), message: 'Rescanning library…' } });
    await tauriApi.rescanLibrary();
    await Promise.all([get().refreshTracks(), get().refreshFolders()]);
    set({ syncStatus: { running: false, lastScanAt: new Date().toISOString(), message: 'Rescan complete' } });
  },
  setQuery(query) {
    set({ query });
  },
  toggleSelectTrack(id) {
    const selected = new Set(get().selectedTrackIds);
    if (selected.has(id)) selected.delete(id); else selected.add(id);
    set({ selectedTrackIds: [...selected] });
  },
}));
