import { useEffect, useState } from "react";
import { connect, type RelayClient, type RelayStatus } from "../relay.ts";

let cached: { url: string; client: RelayClient } | null = null;

function getOrConnect(): RelayClient {
  const relayUrl = import.meta.env.VITE_RELAY_URL ?? "ws://localhost:3000/ws";

  if (cached && cached.url === relayUrl && cached.client.status() !== "closed") {
    return cached.client;
  }

  const name = `web-${crypto.randomUUID().slice(0, 8)}`;
  const client = connect(relayUrl, name);
  cached = { url: relayUrl, client };
  return client;
}

export function useRelay(): { client: RelayClient | null; status: RelayStatus } {
  const [client, setClient] = useState<RelayClient | null>(null);
  const [status, setStatus] = useState<RelayStatus>("connecting");

  useEffect(() => {
    const c = getOrConnect();
    setClient(c);
    const unsub = c.onStatus(setStatus);
    return unsub;
  }, []);

  return { client, status };
}
