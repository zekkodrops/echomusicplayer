import { useEffect, useState } from 'react';
import { LibraryView } from '../features/library/LibraryView';
import { PlayerBar } from '../features/player/PlayerBar';
import { PlaylistsView } from '../features/playlists/PlaylistsView';
import { SettingsView } from '../features/settings/SettingsView';
import { NowPlayingPanel } from '../features/now-playing/NowPlayingPanel';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';
import { useAudioEngine } from '../hooks/useAudioEngine';

type View = 'library' | 'playlists' | 'settings';

export function App() {
  const [view, setView] = useState<View>('library');
  const { initialize, importFiles, addFolder } = useLibraryStore();
  const { togglePlay, playNext, playPrevious, setVolume, volume, toggleMute, toggleShuffle, persistSettings, restoreSettings } = usePlayerStore();

  useAudioEngine();

  useEffect(() => {
    initialize().catch(console.error);
    restoreSettings().catch(console.error);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
      switch (event.key.toLowerCase()) {
        case ' ':
          event.preventDefault();
          togglePlay();
          break;
        case 'arrowright':
          playNext();
          break;
        case 'arrowleft':
          playPrevious();
          break;
        case 'arrowup':
          setVolume(Math.min(1, volume + 0.05));
          break;
        case 'arrowdown':
          setVolume(Math.max(0, volume - 0.05));
          break;
        case 'm':
          toggleMute();
          break;
        case 's':
          toggleShuffle();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, playNext, playPrevious, setVolume, volume, toggleMute, toggleShuffle]);

  useEffect(() => {
    const id = setInterval(() => persistSettings().catch(() => null), 5000);
    return () => clearInterval(id);
  }, [persistSettings]);

  return (
    <main className="flex h-screen flex-col bg-echo-base text-slate-100">
      <div className="flex min-h-0 flex-1">
        <aside className="w-56 border-r border-white/10 bg-echo-surface p-4">
          <h1 className="mb-6 text-2xl font-bold tracking-tight">Echo</h1>
          <nav className="space-y-2 text-sm">
            <button className="w-full rounded-lg px-3 py-2 text-left hover:bg-white/10" onClick={() => setView('library')}>Library</button>
            <button className="w-full rounded-lg px-3 py-2 text-left hover:bg-white/10" onClick={() => setView('playlists')}>Playlists</button>
            <button className="w-full rounded-lg px-3 py-2 text-left hover:bg-white/10" onClick={() => setView('settings')}>Settings</button>
          </nav>
          <div className="mt-6 space-y-2">
            <button onClick={() => importFiles()} className="w-full rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/20">Add Files</button>
            <button onClick={() => addFolder()} className="w-full rounded-lg bg-echo-gradient px-3 py-2 text-sm">Add Folder</button>
          </div>
        </aside>

        <section className="min-h-0 flex-1 p-4">
          {view === 'library' && <LibraryView />}
          {view === 'playlists' && <PlaylistsView />}
          {view === 'settings' && <SettingsView />}
        </section>

        <NowPlayingPanel />
      </div>
      <PlayerBar />
    </main>
  );
}
