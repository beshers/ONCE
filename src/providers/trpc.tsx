import { createTRPCReact } from "@trpc/react-query";
import { createWSClient, httpBatchLink, splitLink, wsLink } from "@trpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import superjson from "superjson";
import type { AppRouter } from "../../api/router";
import type { ReactNode } from "react";

export const trpc = createTRPCReact<AppRouter>();
export const enableWebSockets = import.meta.env.VITE_ENABLE_WS === "true";

const queryClient = new QueryClient();
const wsClient = createWSClient({
  url:
    import.meta.env.VITE_WS_URL ||
    `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.hostname}:3001`,
});

const trpcClient = trpc.createClient({
  links: [
    splitLink({
      condition(op) {
        return enableWebSockets && op.type === "subscription";
      },
      true: wsLink({ client: wsClient, transformer: superjson }),
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

export function TRPCProvider({ children }: { children: ReactNode }) {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
