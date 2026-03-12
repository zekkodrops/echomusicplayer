import { usePlayerStore } from '../../store/playerStore';

export function PlayerBar() {
  const {
    queue, currentIndex, isPlaying, position, volume, muted, repeatMode, shuffle,
    playNext, playPrevious, togglePlay, setVolume, toggleMute, toggleShuffle,
    setRepeatMode, toggleNowPlaying,
  } = usePlayerStore();

  const current = queue[currentIndex];

  return (
    <footer className="grid h-24 grid-cols-3 items-center border-t border-white/10 bg-echo-surface px-4">
      <div>
        <p className="font-medium">{current?.title ?? 'Nothing playing'}</p>
        <p className="text-xs text-slate-400">{current?.artist ?? 'Import tracks to start listening'}</p>
      </div>
      <div className="flex items-center justify-center gap-2">
        <button onClick={toggleShuffle} className={`rounded px-2 py-1 text-xs ${shuffle ? 'bg-echo-accent' : 'bg-white/10'}`}>Shuffle</button>
        <button onClick={playPrevious} className="rounded bg-white/10 px-3 py-1">◀</button>
        <button onClick={togglePlay} className="rounded bg-echo-gradient px-4 py-2 text-sm font-semibold shadow-glow">{isPlaying ? 'Pause' : 'Play'}</button>
        <button onClick={playNext} className="rounded bg-white/10 px-3 py-1">▶</button>
        <button onClick={() => setRepeatMode(repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off')} className="rounded bg-white/10 px-2 py-1 text-xs">Repeat: {repeatMode}</button>
      </div>
      <div className="flex items-center justify-end gap-3">
        <span className="text-xs text-slate-300">{Math.floor(position)}s</span>
        <button onClick={toggleMute} className="rounded bg-white/10 px-2 py-1 text-xs">{muted ? 'Unmute' : 'Mute'}</button>
        <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
        <button onClick={toggleNowPlaying} className="rounded bg-white/10 px-2 py-1 text-xs">Now Playing</button>
      </div>
    </footer>
  );
}
