import { useEffect, useState } from "react";
import type { PeerMeta } from "@ai-orchestration/lib";
import type { RelayClient } from "../relay.ts";

export type Orchestrator = { id: string; meta?: PeerMeta };

export function useOrchestrators(client: RelayClient | null): {
  orchestrators: Orchestrator[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
} {
  const [orchestrators, setOrchestrators] = useState<Orchestrator[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!client) return;

    const offList = client.on("orchestrator_list", (msg) => {
      setOrchestrators(msg.orchestrators);
      setSelectedId((current) => current ?? msg.orchestrators[0]?.id ?? null);
    });

    const offJoined = client.on("orchestrator_joined", (msg) => {
      setOrchestrators((prev) =>
        prev.some((o) => o.id === msg.id) ? prev : [...prev, { id: msg.id, meta: msg.meta }],
      );
      setSelectedId((current) => current ?? msg.id);
    });

    const offLeft = client.on("orchestrator_left", (msg) => {
      setOrchestrators((prev) => prev.filter((o) => o.id !== msg.id));
      setSelectedId((current) => (current === msg.id ? null : current));
    });

    return () => {
      offList();
      offJoined();
      offLeft();
    };
  }, [client]);

  return { orchestrators, selectedId, setSelectedId };
}
