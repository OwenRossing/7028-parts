"use client";

import { useEffect, useRef, useState } from "react";
import type { SSEEvent } from "@/lib/sse-registry";

interface UseSSEOptions {
  onEvent: (event: SSEEvent) => void;
  enabled?: boolean;
}

export function useSSE(projectId: string | null, { onEvent, enabled = true }: UseSSEOptions) {
  const [connected, setConnected] = useState(false);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!projectId || !enabled) return;

    let es: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let dead = false;

    function connect() {
      if (dead) return;
      es = new EventSource(`/api/projects/${projectId}/events`);

      es.onopen = () => setConnected(true);

      es.onmessage = (e) => {
        try {
          const raw = JSON.parse(e.data) as Record<string, unknown>;
          if (raw["type"] !== "connected") {
            onEventRef.current(raw as unknown as SSEEvent);
          }
        } catch {
          // ignore malformed events
        }
      };

      es.onerror = () => {
        setConnected(false);
        es?.close();
        es = null;
        if (!dead) {
          reconnectTimeout = setTimeout(connect, 2000);
        }
      };
    }

    connect();

    return () => {
      dead = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      es?.close();
      setConnected(false);
    };
  }, [projectId, enabled]);

  return { connected };
}
