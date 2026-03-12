import { useMemo } from 'react';
import { useLibraryStore } from '../../store/libraryStore';
import { usePlayerStore } from '../../store/playerStore';

const formatDuration = (seconds: number | null) => {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export function LibraryView() {
  const { tracks, query, setQuery, toggleSelectTrack, selectedTrackIds } = useLibraryStore();
  const { playTrack } = usePlayerStore();

  const filtered = useMemo(() => tracks.filter((track) => {
    const q = query.toLowerCase();
    return !q || [track.title, track.artist, track.album, track.extension].some((f) => f.toLowerCase().includes(q));
  }), [tracks, query]);

  return (
    <section className="flex h-full flex-col rounded-2xl bg-echo-surface/80 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search songs, artist, album, format"
          className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
        />
        <span className="whitespace-nowrap text-xs text-slate-300">{filtered.length} tracks</span>
      </div>
      <div className="overflow-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-echo-panel text-xs uppercase text-slate-300">
            <tr>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Artist</th>
              <th className="px-3 py-2">Album</th>
              <th className="px-3 py-2">Format</th>
              <th className="px-3 py-2">Duration</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((track) => (
              <tr
                key={track.id}
                className={`cursor-pointer border-t border-white/5 ${selectedTrackIds.includes(track.id) ? 'bg-echo-accent/20' : 'hover:bg-white/5'}`}
                onClick={() => toggleSelectTrack(track.id)}
                onDoubleClick={() => playTrack(track, filtered)}
              >
                <td className="px-3 py-2">{track.title}</td>
                <td className="px-3 py-2 text-slate-300">{track.artist}</td>
                <td className="px-3 py-2 text-slate-300">{track.album}</td>
                <td className="px-3 py-2 uppercase text-slate-400">{track.extension}</td>
                <td className="px-3 py-2 text-slate-300">{formatDuration(track.durationSeconds)}</td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-slate-400">Your library is empty. Import files or folders to begin.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
