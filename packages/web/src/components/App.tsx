import { useCallback, useState } from "react";
import { uuid } from "../uuid.ts";
import { useRelay } from "../hooks/useRelay.ts";
import { useOrchestrators } from "../hooks/useOrchestrators.ts";
import { useCommand } from "../hooks/useCommand.ts";
import { ConnectionBar } from "./ConnectionBar.tsx";
import { OrchestratorPanel } from "./OrchestratorPanel.tsx";
import { ProjectsPanel } from "./ProjectsPanel.tsx";
import { SessionsPanel } from "./SessionsPanel.tsx";
import { ResultLog } from "./ResultLog.tsx";
import type { LogEntry } from "../types.ts";

const MAX_LOG_ENTRIES = 100;

export function App() {
  const { client, status } = useRelay();
  const { orchestrators, selectedId, setSelectedId } = useOrchestrators(client);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);

  const appendLog = useCallback(
    (level: "info" | "error", message: string, detail?: unknown) => {
      setLog((prev) =>
        [
          { id: uuid(), ts: Date.now(), level, message, detail },
          ...prev,
        ].slice(0, MAX_LOG_ENTRIES),
      );
    },
    [],
  );

  const run = useCommand(client, selectedId, appendLog);
  const ready = status === "open" && selectedId !== null;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <ConnectionBar status={status} clientId={client?.id ?? null} />

      <main className="flex-1 min-h-0 p-4 grid gap-4 lg:grid-cols-2 items-stretch">
        <div className="flex flex-col gap-4 min-h-0 overflow-y-auto">
          <OrchestratorPanel
            orchestrators={orchestrators}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <ProjectsPanel
            run={run}
            ready={ready}
            selectedProjectId={selectedProjectId}
            onSelectProject={setSelectedProjectId}
          />
          {selectedProjectId && (
            <SessionsPanel run={run} ready={ready} projectId={selectedProjectId} />
          )}
        </div>

        <div className="flex flex-col gap-4 min-h-0">
          <ResultLog entries={log} onClear={() => setLog([])} />
        </div>
      </main>
    </div>
  );
}
