import { useEffect, useState } from "react";
import type { Project } from "@ai-orchestration/lib";
import type { CommandRunner } from "../hooks/useCommand.ts";

export function ProjectsPanel({
  run,
  ready,
  selectedProjectId,
  onSelectProject,
}: {
  run: CommandRunner;
  ready: boolean;
  selectedProjectId: string | null;
  onSelectProject: (id: string | null) => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [creating, setCreating] = useState(false);

  const refresh = async () => {
    if (!ready) return;
    setLoading(true);
    setError(null);
    try {
      const result = await run("list_projects", {});
      setProjects(result.projects);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ready) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await run("create_project", {
        name: name.trim(),
        ...(repoUrl.trim() ? { repoUrl: repoUrl.trim() } : {}),
      });
      setName("");
      setRepoUrl("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <section className="rounded border border-slate-800 bg-slate-900/40">
      <header className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200">Projects</h2>
        <button
          type="button"
          onClick={refresh}
          disabled={!ready || loading}
          className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      <form onSubmit={create} className="px-4 py-3 border-b border-slate-800 flex flex-wrap gap-2">
        <input
          className="flex-1 min-w-[10rem] px-2 py-1 text-sm rounded bg-slate-950 border border-slate-700"
          placeholder="Project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!ready || creating}
        />
        <input
          className="flex-1 min-w-[14rem] px-2 py-1 text-sm rounded bg-slate-950 border border-slate-700"
          placeholder="Repo URL (optional)"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          disabled={!ready || creating}
        />
        <button
          type="submit"
          disabled={!ready || creating || !name.trim()}
          className="px-3 py-1 text-sm rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40"
        >
          {creating ? "Creating…" : "Create"}
        </button>
      </form>

      {error && <p className="px-4 py-2 text-xs text-rose-400">{error}</p>}

      {projects.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-500">No projects.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2 font-normal">Open</th>
                <th className="px-4 py-2 font-normal">ID</th>
                <th className="px-4 py-2 font-normal">Name</th>
                <th className="px-4 py-2 font-normal">Repo</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr
                  key={p.id}
                  className={`border-t border-slate-800/60 ${selectedProjectId === p.id ? "bg-slate-800/40" : ""}`}
                >
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() => onSelectProject(p.id === selectedProjectId ? null : p.id)}
                      className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"
                    >
                      {selectedProjectId === p.id ? "Close" : "Sessions"}
                    </button>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-400">{p.id}</td>
                  <td className="px-4 py-2 text-slate-200 max-w-[10rem] truncate">{p.name}</td>
                  <td className="px-4 py-2 text-slate-400 max-w-[12rem] truncate">{p.repoUrl ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
