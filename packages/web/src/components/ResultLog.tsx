import type { LogEntry } from "../types.ts";

export function ResultLog({ entries, onClear }: { entries: LogEntry[]; onClear: () => void }) {
  return (
    <section className="rounded border border-slate-800 bg-slate-900/40 flex flex-col flex-1 min-h-0">
      <header className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200">Activity</h2>
        <button
          type="button"
          onClick={onClear}
          className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"
        >
          Clear
        </button>
      </header>

      {entries.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-500">No activity yet.</p>
      ) : (
        <ul className="flex-1 overflow-y-auto divide-y divide-slate-800/60 font-mono text-xs">
          {entries.map((e) => (
            <li key={e.id} className="px-4 py-2">
              <div className="flex gap-2">
                <span className="text-slate-500">{new Date(e.ts).toLocaleTimeString()}</span>
                <span className={e.level === "error" ? "text-rose-400" : "text-slate-200"}>
                  {e.message}
                </span>
              </div>
              {e.detail !== undefined && (
                <pre className="mt-1 text-slate-400 whitespace-pre-wrap break-all">
                  {JSON.stringify(e.detail, null, 2)}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
