type MysqlConnectionOptions = {
  host: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: {
    rejectUnauthorized: boolean;
  };
};

export function getMysqlConnectionOptions(databaseUrl: string): MysqlConnectionOptions {
  const url = new URL(databaseUrl);

  if (url.hostname === "localhost") {
    url.hostname = "127.0.0.1";
  }

  const sslMode = (url.searchParams.get("ssl-mode") || url.searchParams.get("sslmode") || "").toUpperCase();

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : undefined,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, "")),
    ssl: sslMode === "REQUIRED" ? { rejectUnauthorized: true } : undefined,
  };
}
