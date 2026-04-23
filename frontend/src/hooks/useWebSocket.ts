import { useEffect, useRef } from "react";
import { useDockerStore } from "../store/useDockerStore";
import { useMetricsStore } from "../store/useMetricsStore";

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const retryDelay = useRef(1000);
  const setContainers = useDockerStore((s) => s.setContainers);
  const setMetrics = useMetricsStore((s) => s.setMetrics);

  useEffect(() => {
    let pingInterval: ReturnType<typeof setInterval>;
    let unmounted = false;

    function connect() {
      if (unmounted) return;

      const protocol = location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${protocol}//${location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        retryDelay.current = 1000;
        pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 30_000);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "docker:update") setContainers(msg.payload);
          if (msg.type === "metrics:update") setMetrics(msg.payload);
        } catch {
          // ignore
        }
      };

      ws.onclose = () => {
        clearInterval(pingInterval);
        if (!unmounted) {
          setTimeout(connect, retryDelay.current);
          retryDelay.current = Math.min(retryDelay.current * 2, 30_000);
        }
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      unmounted = true;
      clearInterval(pingInterval);
      wsRef.current?.close();
    };
  }, [setContainers, setMetrics]);
}
