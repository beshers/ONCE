import type { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "fs";
import path from "path";

type App = Hono<{ Bindings: HttpBindings }>;

export function serveStaticFiles(app: App) {
  const distPath = path.resolve(import.meta.dirname, "../dist/public");
  const indexPath = path.resolve(distPath, "index.html");

  app.get("/assets/*", serveStatic({ root: "./dist/public" }));
  app.get("/manifest.json", serveStatic({ path: "./dist/public/manifest.json" }));
  app.get("/sw.js", serveStatic({ path: "./dist/public/sw.js" }));
  app.get("/favicon.ico", serveStatic({ path: "./dist/public/favicon.ico" }));

  app.get("*", (c) => {
    const pathname = new URL(c.req.url).pathname;
    if (pathname.startsWith("/api/")) {
      return c.json({ error: "Not Found" }, 404);
    }

    const content = fs.readFileSync(indexPath, "utf-8");
    return c.html(content);
  });

  app.notFound((c) => {
    const accept = c.req.header("accept") ?? "";
    if (!accept.includes("text/html")) {
      return c.json({ error: "Not Found" }, 404);
    }
    const content = fs.readFileSync(indexPath, "utf-8");
    return c.html(content);
  });
}
