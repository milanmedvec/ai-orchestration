import { useEffect, useState } from "react";
import { connect, type RelayClient, type RelayStatus } from "../relay.ts";
import { uuid } from "../uuid.ts";
import { config } from "../config.ts";

let cached: { url: string; token: string | undefined; client: RelayClient } | null = null;

function getOrConnect(token: string | undefined): RelayClient {
  const relayUrl = config.RELAY_URL;

  if (
    cached &&
    cached.url === relayUrl &&
    cached.token === token &&
    cached.client.status() !== "closed"
  ) {
    return cached.client;
  }

  cached?.client.close();

  const name = `web-${uuid().slice(0, 8)}`;
  const client = connect(relayUrl, name, token);
  cached = { url: relayUrl, token, client };
  return client;
}

export function useRelay(token: string | undefined): { client: RelayClient | null; status: RelayStatus } {
  const [client, setClient] = useState<RelayClient | null>(null);
  const [status, setStatus] = useState<RelayStatus>("connecting");

  useEffect(() => {
    const c = getOrConnect(token);
    setClient(c);
    const unsub = c.onStatus(setStatus);
    return unsub;
  }, [token]);

  return { client, status };
}
