import { useEffect, useState } from "react";
import { connect, type RelayClient, type RelayStatus } from "../relay.ts";

type ConfigResponse = { relayUrl: string };

let cached: { url: string; client: RelayClient } | null = null;

async function getOrConnect(): Promise<RelayClient> {
  const res = await fetch("/config");
  const { relayUrl } = (await res.json()) as ConfigResponse;

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
    let unsubStatus: (() => void) | null = null;
    let cancelled = false;

    getOrConnect().then((c) => {
      if (cancelled) return;
      setClient(c);
      unsubStatus = c.onStatus(setStatus);
    });

    return () => {
      cancelled = true;
      unsubStatus?.();
    };
  }, []);

  return { client, status };
}
