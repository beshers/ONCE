import { createTRPCReact } from "@trpc/react-query";
import { createWSClient, httpBatchLink, splitLink, wsLink } from "@trpc/client";
import { QueryClient } from "@tanstack/react-query";
import superjson from "superjson";
import type { AppRouter } from "../../api/router";

export const trpc = createTRPCReact<AppRouter>();
export const enableWebSockets = import.meta.env.VITE_ENABLE_WS !== "false";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
      staleTime: 30_000,
    },
    mutations: {
      retry: 0,
    },
  },
});

const wsClient = enableWebSockets
  ? createWSClient({
      url:
        import.meta.env.VITE_WS_URL ||
        `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/api/trpc/ws`,
    })
  : null;

export const trpcClient = trpc.createClient({
  links: [
    splitLink({
      condition(op) {
        return enableWebSockets && op.type === "subscription";
      },
      true: wsLink({ client: wsClient!, transformer: superjson }),
      false: httpBatchLink({
        url: "/api/trpc",
        transformer: superjson,
        fetch(input, init) {
          return globalThis.fetch(input, {
            ...(init ?? {}),
            credentials: "include",
          });
        },
      }),
    }),
  ],
});
