import type { ServerWebSocket } from "bun";
import type { Role, PeerMeta } from "@ai-orchestration/lib";

export interface PeerSocketData {
  connectedAt: number;
  id: string | null;
}

export interface Peer {
  id: string;
  role: Role;
  meta?: PeerMeta;
  ws: ServerWebSocket<PeerSocketData>;
}

export const peers = new Map<string, Peer>();

export function addPeer(peer: Peer): void {
  peers.set(peer.id, peer);
}

export function removePeer(id: string): void {
  peers.delete(id);
}

export function getPeer(id: string): Peer | undefined {
  return peers.get(id);
}

export function getOrchestrators(): Peer[] {
  return [...peers.values()].filter((p) => p.role === "orchestrator");
}

export function getClients(): Peer[] {
  return [...peers.values()].filter((p) => p.role === "client");
}
