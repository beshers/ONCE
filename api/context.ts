import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { CreateWSSContextFnOptions } from "@trpc/server/adapters/ws";
import type { User } from "@db/schema";
import { findUserByEmail, findUserById } from "./queries/users";
import * as cookie from "cookie";
import { Session } from "@contracts/constants";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User;
};

export async function authenticateFromHeaders(headers: Headers): Promise<User | undefined> {
  try {
    const cookies = cookie.parse(headers.get("cookie") || "");
    const token = cookies[Session.cookieName];

    if (!token) {
      return undefined;
    }

    const userId = token.split(":")[0];
    if (!userId) {
      return undefined;
    }

    return (await findUserById(userId)) ?? (await findUserByEmail(userId)) ?? undefined;
  } catch {
    return undefined;
  }
}

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };
  try {
    ctx.user = await authenticateFromHeaders(opts.req.headers);
  } catch {}
  return ctx;
}

export async function createWSContext(
  opts: CreateWSSContextFnOptions,
): Promise<TrpcContext> {
  const headers = new Headers(opts.req.headers as Record<string, string>);
  const req = new Request("http://localhost/ws", { headers });
  const ctx: TrpcContext = { req, resHeaders: new Headers() };

  try {
    ctx.user = await authenticateFromHeaders(headers);
  } catch {}

  return ctx;
}
