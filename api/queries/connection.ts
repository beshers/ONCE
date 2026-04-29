import { drizzle } from "drizzle-orm/mysql2";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof drizzle<typeof fullSchema>>;

function getDatabaseUrl() {
  if (!env.databaseUrl) {
    return env.databaseUrl;
  }

  const url = new URL(env.databaseUrl);
  if (url.hostname === "localhost") {
    url.hostname = "127.0.0.1";
  }
  return url.toString();
}

export function getDb() {
  if (!instance) {
    instance = drizzle(getDatabaseUrl(), { schema: fullSchema, mode: "default" });
  }
  return instance;
}
