import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";
import { getMysqlConnectionOptions } from "./mysql-config";

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof drizzle<typeof fullSchema>>;
let pool: mysql.Pool;

export function getDb() {
  if (!instance) {
    pool = mysql.createPool(getMysqlConnectionOptions(env.databaseUrl));
    instance = drizzle(pool, { schema: fullSchema, mode: "default" });
  }
  return instance;
}
