import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

function optional(name: string): string {
  return process.env[name] ?? "";
}

export const env = {
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  appId: optional("KIMI_APP_ID"),
  appSecret: optional("KIMI_APP_SECRET"),
  kimiAuthUrl: process.env.KIMI_AUTH_URL || "https://www.kimi.com",
  kimiOpenUrl: process.env.KIMI_OPEN_URL || "https://api.kimi.com",
};

export function requireKimiCredentials() {
  if (!env.appId || !env.appSecret) {
    throw new Error("Kimi OAuth is not configured. Set KIMI_APP_ID and KIMI_APP_SECRET.");
  }
}
