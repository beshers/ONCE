import type { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "fs";
import path from "path";

type App = Hono<{ Bindings: HttpBindings }>;

export function serveStaticFiles(app: App) {
  const distPath = path.resolve(import.meta.dirname, "../dist/public");
  const indexPath = path.resolve(distPath, "index.html");

  app.use("/assets/*", async (c, next) => {
    await next();
    c.header("Cache-Control", "public, max-age=31536000, immutable");
  });
  app.use("/downloads/*", async (c, next) => {
    await next();
    c.header("Cache-Control", "public, max-age=3600, must-revalidate");
  });
  app.use("/manifest.json", async (c, next) => {
    await next();
    c.header("Cache-Control", "no-cache, must-revalidate");
  });
  app.use("/sw.js", async (c, next) => {
    await next();
    c.header("Cache-Control", "no-cache, no-store, must-revalidate");
    c.header("Pragma", "no-cache");
  });
  app.use("/favicon.ico", async (c, next) => {
    await next();
    c.header("Cache-Control", "public, max-age=86400, must-revalidate");
  });

  app.get("/assets/*", serveStatic({ root: "./dist/public" }));
  app.get("/downloads/*", serveStatic({ root: "./dist/public" }));
  app.get("/manifest.json", serveStatic({ path: "./dist/public/manifest.json" }));
  app.get("/sw.js", serveStatic({ path: "./dist/public/sw.js" }));
  app.get("/favicon.ico", serveStatic({ path: "./dist/public/favicon.ico" }));

  app.get("*", (c) => {
    const pathname = new URL(c.req.url).pathname;
    if (pathname.startsWith("/api/")) {
      return c.json({ error: "Not Found" }, 404);
    }

    const content = fs.readFileSync(indexPath, "utf-8");
    return c.html(content, 200, {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
    });
  });

  app.notFound((c) => {
    const accept = c.req.header("accept") ?? "";
    if (!accept.includes("text/html")) {
      return c.json({ error: "Not Found" }, 404);
    }
    const content = fs.readFileSync(indexPath, "utf-8");
    return c.html(content, 200, {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
    });
  });
}
