import { create } from 'zustand';
import { tauriApi } from '../lib/tauri';
import type { AppSettings, RepeatMode, Track } from '../types/models';

interface PlayerState {
  queue: Track[];
  currentIndex: number;
  isPlaying: boolean;
  volume: number;
  muted: boolean;
  repeatMode: RepeatMode;
  shuffle: boolean;
  position: number;
  nowPlayingOpen: boolean;
  setQueue: (queue: Track[], startIndex?: number) => void;
  playTrack: (track: Track, list?: Track[]) => void;
  playNext: () => void;
  playPrevious: () => void;
  togglePlay: () => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  setPosition: (p: number) => void;
  toggleShuffle: () => void;
  setRepeatMode: (mode: RepeatMode) => void;
  toggleNowPlaying: () => void;
  restoreSettings: () => Promise<void>;
  persistSettings: () => Promise<void>;
}

const cycleRepeat = (mode: RepeatMode): RepeatMode => mode === 'off' ? 'all' : mode === 'all' ? 'one' : 'off';

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  currentIndex: -1,
  isPlaying: false,
  volume: 0.8,
  muted: false,
  repeatMode: 'off',
  shuffle: false,
  position: 0,
  nowPlayingOpen: false,
  setQueue(queue, startIndex = 0) {
    set({ queue, currentIndex: startIndex, isPlaying: queue.length > 0 });
  },
  playTrack(track, list) {
    const queue = list?.length ? list : get().queue;
    const idx = queue.findIndex((t) => t.id === track.id);
    if (idx >= 0) {
      set({ queue, currentIndex: idx, isPlaying: true });
    } else {
      set({ queue: [track, ...queue], currentIndex: 0, isPlaying: true });
    }
  },
  playNext() {
    const { queue, currentIndex, repeatMode, shuffle } = get();
    if (!queue.length) return;
    if (repeatMode === 'one') return set({ isPlaying: true, position: 0 });
    if (shuffle) return set({ currentIndex: Math.floor(Math.random() * queue.length), isPlaying: true, position: 0 });
    if (currentIndex + 1 < queue.length) return set({ currentIndex: currentIndex + 1, isPlaying: true, position: 0 });
    if (repeatMode === 'all') return set({ currentIndex: 0, isPlaying: true, position: 0 });
    set({ isPlaying: false });
  },
  playPrevious() {
    const { queue, currentIndex } = get();
    if (!queue.length) return;
    set({ currentIndex: currentIndex > 0 ? currentIndex - 1 : 0, isPlaying: true, position: 0 });
  },
  togglePlay() { set({ isPlaying: !get().isPlaying }); },
  setVolume(volume) { set({ volume: Math.max(0, Math.min(1, volume)) }); },
  toggleMute() { set({ muted: !get().muted }); },
  setPosition(position) { set({ position }); },
  toggleShuffle() { set({ shuffle: !get().shuffle }); },
  setRepeatMode(mode) { set({ repeatMode: mode ?? cycleRepeat(get().repeatMode) }); },
  toggleNowPlaying() { set({ nowPlayingOpen: !get().nowPlayingOpen }); },
  async restoreSettings() {
    const settings = await tauriApi.loadSettings();
    set({ volume: settings.volume, muted: settings.muted, repeatMode: settings.repeatMode, shuffle: settings.shuffle, position: settings.lastPosition });
  },
  async persistSettings() {
    const current = get();
    const playing = current.queue[current.currentIndex];
    const settings: AppSettings = {
      volume: current.volume,
      muted: current.muted,
      repeatMode: current.repeatMode,
      shuffle: current.shuffle,
      lastTrackId: playing?.id ?? null,
      lastPosition: current.position,
    };
    await tauriApi.saveSettings(settings);
  },
}));
