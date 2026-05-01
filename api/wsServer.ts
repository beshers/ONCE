import { applyWSSHandler } from "@trpc/server/adapters/ws";
import type { Server } from "node:http";
import { WebSocketServer } from "ws";
import { appRouter } from "./router";
import { createWSContext } from "./context";
import { handleCollabConnection } from "./collabServer";

const globalWsState = globalThis as typeof globalThis & {
  __phpBackendWss?: WebSocketServer;
};

export function startWSServer(server?: Server) {
  if (globalWsState.__phpBackendWss) {
    return globalWsState.__phpBackendWss;
  }

  const port = parseInt(process.env.WS_PORT ?? "3001", 10);
  const wss = server ? new WebSocketServer({ noServer: true }) : new WebSocketServer({ port });

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

  if (server) {
    server.on("upgrade", (request, socket, head) => {
      const url = new URL(request.url ?? "/", "http://localhost");
      if (url.pathname.startsWith("/api/collab")) {
        wss.handleUpgrade(request, socket, head, (ws) => {
          handleCollabConnection(ws, request);
        });
        return;
      }

      if (url.pathname !== "/api/trpc/ws") {
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    });
    console.log("[WS] tRPC WebSocket server attached at /api/trpc/ws");
    console.log("[WS] Collaboration WebSocket server attached at /api/collab/:room");
  } else {
    wss.on("listening", () => {
      console.log(`[WS] tRPC WebSocket server listening on ws://localhost:${port}`);
    });
  }

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
