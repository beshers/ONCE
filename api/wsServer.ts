import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { WebSocketServer } from "ws";
import { appRouter } from "./router";
import { createWSContext } from "./context";

const globalWsState = globalThis as typeof globalThis & {
  __phpBackendWss?: WebSocketServer;
};

export function startWSServer() {
  if (globalWsState.__phpBackendWss) {
    return globalWsState.__phpBackendWss;
  }

  const port = parseInt(process.env.WS_PORT ?? "3001", 10);
  const wss = new WebSocketServer({ port });

  const handler = applyWSSHandler({
    wss,
    router: appRouter,
    createContext: createWSContext,
    keepAlive: {
      enabled: true,
      pingMs: 30000,
      pongWaitMs: 5000,
    },
  });

  wss.on("listening", () => {
    console.log(`[WS] tRPC WebSocket server listening on ws://localhost:${port}`);
  });

  wss.on("error", (err: unknown) => {
    console.error("[WS] WebSocket server error:", err);
  });

  const shutdown = () => {
    handler.broadcastReconnectNotification();
    wss.close();
    if (globalWsState.__phpBackendWss === wss) {
      globalWsState.__phpBackendWss = undefined;
    }
  };

  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);

  globalWsState.__phpBackendWss = wss;
  return wss;
}
