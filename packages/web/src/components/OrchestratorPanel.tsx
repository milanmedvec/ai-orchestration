import type { Orchestrator } from "../hooks/useOrchestrators.ts";

export function OrchestratorPanel({
  orchestrators,
  selectedId,
  onSelect,
}: {
  orchestrators: Orchestrator[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="rounded border border-slate-800 bg-slate-900/40">
      <header className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200">Orchestrators</h2>
        <span className="text-xs text-slate-500">{orchestrators.length} connected</span>
      </header>

      {orchestrators.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-500">No orchestrators connected.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2 font-normal">Use</th>
              <th className="px-4 py-2 font-normal">ID</th>
              <th className="px-4 py-2 font-normal">Name</th>
              <th className="px-4 py-2 font-normal">Capabilities</th>
            </tr>
          </thead>
          <tbody>
            {orchestrators.map((o) => (
              <tr key={o.id} className="border-t border-slate-800/60">
                <td className="px-4 py-2">
                  <input
                    type="radio"
                    name="orchestrator"
                    checked={selectedId === o.id}
                    onChange={() => onSelect(o.id)}
                  />
                </td>
                <td className="px-4 py-2 font-mono text-xs text-slate-400">{o.id}</td>
                <td className="px-4 py-2 text-slate-200">{o.meta?.name ?? "—"}</td>
                <td className="px-4 py-2 text-slate-400">
                  {o.meta?.capabilities?.join(", ") ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
