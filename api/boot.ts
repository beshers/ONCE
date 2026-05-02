import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { nanoid } from "nanoid";
import { appRouter } from "./router";
import { authenticateFromHeaders, createContext } from "./context";
import { env } from "./lib/env";
import { ensureDatabaseSchema } from "./queries/schema-guard";
import { startWSServer } from "./wsServer";

try {
  await ensureDatabaseSchema();
} catch (error) {
  if (env.isProduction) {
    throw error;
  }

  console.warn(
    "Database schema check skipped:",
    error instanceof Error ? error.message : error,
  );
}

if (!env.isProduction && process.env.ENABLE_WS !== "false") {
  startWSServer();
}

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));
app.get("/uploads/chat/*", serveStatic({ root: "./" }));
app.post("/api/chat/upload", async (c) => {
  const user = await authenticateFromHeaders(c.req.raw.headers);
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const form = await c.req.formData();
  const rawFile = form.get("file");
  if (!rawFile || typeof rawFile !== "object" || !("arrayBuffer" in rawFile)) {
    return c.json({ error: "No file uploaded" }, 400);
  }

  const file = rawFile as File;
  const maxBytes = 25 * 1024 * 1024;
  if (file.size > maxBytes) {
    return c.json({ error: "Files must be 25 MB or smaller" }, 413);
  }

  const safeExtension = extname(file.name || "")
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "")
    .slice(0, 16);
  const fileName = `${Date.now()}-${nanoid(12)}${safeExtension}`;
  const uploadDir = join(process.cwd(), "uploads", "chat");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(join(uploadDir, fileName), Buffer.from(await file.arrayBuffer()));

  return c.json({
    url: `/uploads/chat/${fileName}`,
    name: file.name || "upload",
    size: file.size,
    mimeType: file.type || "application/octet-stream",
    kind: file.type?.startsWith("image/") ? "image" : "file",
  });
});
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  const server = serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
  if (process.env.ENABLE_WS !== "false") {
    startWSServer(server);
  }
}
