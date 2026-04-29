import type { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "fs";
import path from "path";

type App = Hono<{ Bindings: HttpBindings }>;

export function serveStaticFiles(app: App) {
  const distPath = path.resolve(import.meta.dirname, "../dist/public");
  const indexPath = path.resolve(distPath, "index.html");

  app.use("/assets/*", serveStatic({ root: "./dist/public" }));
  app.use("/manifest.json", serveStatic({ root: "./dist/public" }));
  app.use("/sw.js", serveStatic({ root: "./dist/public" }));
  app.get("/", serveStatic({ path: "./dist/public/index.html" }));

  app.get("*", (c) => {
    const accept = c.req.header("accept") ?? "";
    if (!accept.includes("text/html")) {
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
