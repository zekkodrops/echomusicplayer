export type RepeatMode = 'off' | 'all' | 'one';

export interface Track {
  id: number;
  path: string;
  filename: string;
  title: string;
  artist: string;
  album: string;
  durationSeconds: number | null;
  sizeBytes: number;
  extension: string;
  addedAt: string;
  modifiedAt: string;
  playCount: number;
  lastPlayedAt: string | null;
  isFavorite: boolean;
  isMissing: boolean;
}

export interface Folder {
  id: number;
  path: string;
  createdAt: string;
  lastScannedAt: string | null;
  isActive: boolean;
}

export interface Playlist {
  id: number;
  name: string;
  type: 'manual' | 'smart';
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  volume: number;
  muted: boolean;
  repeatMode: RepeatMode;
  shuffle: boolean;
  lastTrackId: number | null;
  lastPosition: number;
}

export interface ScanSummary {
  imported: number;
  markedMissing: number;
  updated: number;
  unsupported: number;
}

export interface SyncStatus {
  running: boolean;
  lastScanAt: string | null;
  message: string;
}
