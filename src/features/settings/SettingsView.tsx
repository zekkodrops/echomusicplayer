import { useLibraryStore } from '../../store/libraryStore';

export function SettingsView() {
  const { folders, removeFolder, rescan, syncStatus } = useLibraryStore();

  return (
    <section className="space-y-4 rounded-2xl bg-echo-surface/80 p-4">
      <div>
        <h2 className="text-lg font-semibold">Settings</h2>
        <p className="text-sm text-slate-400">Manage watched folders and library sync.</p>
      </div>
      <div className="rounded-xl border border-white/10 p-3">
        <h3 className="mb-2 font-medium">Watched folders</h3>
        <ul className="space-y-2 text-sm">
          {folders.map((folder) => (
            <li key={folder.id} className="flex items-center justify-between rounded bg-black/20 px-3 py-2">
              <span className="truncate pr-4">{folder.path}</span>
              <button onClick={() => removeFolder(folder.path)} className="text-xs text-red-300">Remove</button>
            </li>
          ))}
          {!folders.length && <li className="text-slate-400">No folders watched yet.</li>}
        </ul>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={rescan} className="rounded bg-echo-gradient px-3 py-2 text-sm">Rescan Library</button>
        <span className="text-xs text-slate-400">{syncStatus.message}</span>
      </div>
    </section>
  );
}
