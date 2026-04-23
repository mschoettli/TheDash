import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { startDockerMonitor } from "./dockerMonitor";
import { startMetricsMonitor } from "./metricsMonitor";

let wss: WebSocketServer;

export function broadcast(message: object): void {
  if (!wss) return;
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

export function initWebSocketServer(server: HttpServer): void {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws) => {
    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "ping") ws.send(JSON.stringify({ type: "pong" }));
      } catch {
        // ignore malformed messages
      }
    });
  });

  startDockerMonitor(broadcast);
  startMetricsMonitor(broadcast);

  console.log("WebSocket server initialized on /ws");
}
