import { useEffect, useState } from "react";
import type { Session } from "@ai-orchestration/lib";
import type { CommandRunner } from "../hooks/useCommand.ts";

const STATUS_STYLES: Record<Session["status"], string> = {
  active: "text-emerald-300",
  idle: "text-slate-400",
  terminated: "text-rose-400",
};

export function SessionsPanel({
  run,
  ready,
  projectId,
}: {
  run: CommandRunner;
  ready: boolean;
  projectId: string;
}) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [terminatingId, setTerminatingId] = useState<string | null>(null);

  const refresh = async () => {
    if (!ready) return;
    setLoading(true);
    setError(null);
    try {
      const result = await run("list_sessions", { projectId });
      setSessions(result.sessions);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ready) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, projectId]);

  const create = async () => {
    setCreating(true);
    setError(null);
    try {
      await run("create_session", { projectId });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  };

  const terminate = async (sessionId: string) => {
    setTerminatingId(sessionId);
    setError(null);
    try {
      await run("terminate_session", { sessionId });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setTerminatingId(null);
    }
  };

  return (
    <section className="rounded border border-slate-800 bg-slate-900/40">
      <header className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200">
          Sessions <span className="text-xs text-slate-500 font-mono">{projectId}</span>
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={!ready || loading}
            className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={create}
            disabled={!ready || creating}
            className="text-xs px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40"
          >
            {creating ? "Creating…" : "New session"}
          </button>
        </div>
      </header>

      {error && <p className="px-4 py-2 text-xs text-rose-400">{error}</p>}

      {sessions.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-500">No sessions.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2 font-normal">ID</th>
              <th className="px-4 py-2 font-normal">Status</th>
              <th className="px-4 py-2 font-normal text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="border-t border-slate-800/60">
                <td className="px-4 py-2 font-mono text-xs text-slate-400">{s.id}</td>
                <td className={`px-4 py-2 ${STATUS_STYLES[s.status]}`}>{s.status}</td>
                <td className="px-4 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => terminate(s.id)}
                    disabled={!ready || s.status === "terminated" || terminatingId === s.id}
                    className="text-xs px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 disabled:opacity-40"
                  >
                    {terminatingId === s.id ? "Terminating…" : "Terminate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
