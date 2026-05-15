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

export class State {
  readonly peers = new Map<string, Peer>();

  add(peer: Peer): void {
    this.peers.set(peer.id, peer);
  }

  remove(id: string): void {
    this.peers.delete(id);
  }

  get(id: string): Peer | undefined {
    return this.peers.get(id);
  }

  orchestrators(): Peer[] {
    return [...this.peers.values()].filter((p) => p.role === "orchestrator");
  }

  clients(): Peer[] {
    return [...this.peers.values()].filter((p) => p.role === "client");
  }
}
