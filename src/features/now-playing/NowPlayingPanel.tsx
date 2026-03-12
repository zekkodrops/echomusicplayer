import { usePlayerStore } from '../../store/playerStore';

export function NowPlayingPanel() {
  const { queue, currentIndex, nowPlayingOpen } = usePlayerStore();
  const current = queue[currentIndex];

  return (
    <aside className={`h-full border-l border-white/10 bg-echo-surface/70 p-4 transition-all duration-300 ${nowPlayingOpen ? 'w-80 opacity-100' : 'w-0 overflow-hidden p-0 opacity-0'}`}>
      <h3 className="mb-4 text-lg font-semibold">Now Playing</h3>
      {current ? (
        <div className="space-y-3">
          <div className="mx-auto h-40 w-40 rounded-full bg-echo-gradient shadow-glow" />
          <p className="font-medium">{current.title}</p>
          <p className="text-sm text-slate-300">{current.artist} • {current.album}</p>
          <p className="text-xs text-slate-400 uppercase">{current.extension} • {Math.round(current.sizeBytes / 1024 / 1024)} MB</p>
          <p className="break-all text-xs text-slate-500">{current.path}</p>
        </div>
      ) : <p className="text-sm text-slate-400">No track selected.</p>}
    </aside>
  );
}
