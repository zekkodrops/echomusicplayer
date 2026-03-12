export function PlaylistsView() {
  const smart = ['Favorites', 'Recently Added', 'Recently Played', 'Most Played', 'Never Played'];
  return (
    <section className="rounded-2xl bg-echo-surface/80 p-4">
      <h2 className="mb-4 text-lg font-semibold">Playlists</h2>
      <div className="grid grid-cols-2 gap-3">
        {smart.map((name) => (
          <article key={name} className="rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="font-medium">{name}</p>
            <p className="text-xs text-slate-400">Smart playlist scaffold ready.</p>
          </article>
        ))}
      </div>
    </section>
  );
}
