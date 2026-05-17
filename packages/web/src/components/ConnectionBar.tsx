import type { RelayStatus } from "../relay.ts";

const STATUS_STYLES: Record<RelayStatus, string> = {
  connecting: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  open: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  closed: "bg-slate-500/20 text-slate-300 border-slate-500/40",
  error: "bg-rose-500/20 text-rose-300 border-rose-500/40",
};

export function ConnectionBar({
  status,
  clientId,
  onLogout,
}: {
  status: RelayStatus;
  clientId: string | null;
  onLogout: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-slate-900/60">
      <span className="text-sm font-semibold text-slate-200">AI Orchestration</span>
      <span className={`px-2 py-0.5 text-xs rounded border ${STATUS_STYLES[status]}`}>{status}</span>
      {clientId && (
        <span className="text-xs text-slate-500 font-mono truncate">client {clientId.slice(0, 8)}</span>
      )}
      <button
        onClick={onLogout}
        className="ml-auto text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        disconnect
      </button>
    </div>
  );
}
