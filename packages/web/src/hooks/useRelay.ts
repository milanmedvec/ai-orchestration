import { useEffect, useState } from "react";
import { connect, type RelayClient, type RelayStatus } from "../relay.ts";
import { uuid } from "../uuid.ts";
import { config } from "../config.ts";

let cached: { url: string; client: RelayClient } | null = null;

function getOrConnect(): RelayClient {
  const relayUrl = config.RELAY_URL;

  if (cached && cached.url === relayUrl && cached.client.status() !== "closed") {
    return cached.client;
  }

  const name = `web-${uuid().slice(0, 8)}`;
  const token = config.AUTH_TOKEN;
  const client = connect(relayUrl, name, token);
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
