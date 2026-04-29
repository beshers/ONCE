import * as cookie from "cookie";
import { createHash, randomUUID } from "crypto";
import { z } from "zod";
import { Session } from "@contracts/constants";
import { getSessionCookieOptions } from "./lib/cookies";
import { createRouter, publicProcedure } from "./middleware";
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUserLogin,
} from "./queries/users";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

function verifyPassword(password: string, hash: string): boolean {
  const sha256Hash = hashPassword(password);
  const legacyBase64Hash = Buffer.from(password).toString("base64");
  return hash === sha256Hash || hash === legacyBase64Hash;
}

function createSessionToken(userId: string): string {
  return `${userId}:${randomUUID()}`;
}

function serializeSessionCookie(headers: Headers, userId: string): string {
  const sessionOptions = getSessionCookieOptions(headers);
  return cookie.serialize(Session.cookieName, createSessionToken(userId), {
    httpOnly: sessionOptions.httpOnly,
    path: sessionOptions.path,
    sameSite: sessionOptions.sameSite?.toLowerCase() as "lax" | "none" | "strict",
    secure: sessionOptions.secure,
    maxAge: 60 * 60 * 24 * 7,
  });
}

function clearSessionCookie(headers: Headers): string {
  const sessionOptions = getSessionCookieOptions(headers);
  return cookie.serialize(Session.cookieName, "", {
    httpOnly: sessionOptions.httpOnly,
    path: sessionOptions.path,
    sameSite: sessionOptions.sameSite?.toLowerCase() as "lax" | "none" | "strict",
    secure: sessionOptions.secure,
    maxAge: 0,
  });
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
});

export const authRouter = createRouter({
  login: publicProcedure.input(loginSchema).mutation(async ({ ctx, input }) => {
    const user = await findUserByEmail(input.email);
    if (!user || !user.passwordHash || !verifyPassword(input.password, user.passwordHash)) {
      return { success: false, message: "Invalid email or password" };
    }

    await updateUserLogin(user.id);
    ctx.resHeaders.append(
      "set-cookie",
      serializeSessionCookie(ctx.req.headers, user.id),
    );

    return { success: true, user };
  }),

  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ ctx, input }) => {
      const existingUser = await findUserByEmail(input.email);
      if (existingUser) {
        return { success: false, message: "User already exists" };
      }

      const user = await createUser({
        email: input.email,
        passwordHash: hashPassword(input.password),
        firstName: input.firstName,
        lastName: input.lastName,
      });

      ctx.resHeaders.append(
        "set-cookie",
        serializeSessionCookie(ctx.req.headers, user.id),
      );

      return { success: true, user };
    }),

  me: publicProcedure.query(async ({ ctx }) => {
    const cookies = cookie.parse(ctx.req.headers.get("cookie") || "");
    const token = cookies[Session.cookieName];
    const userId = token?.split(":")[0];

    if (!userId) {
      return null;
    }

    const user = await findUserById(userId);
    return user ?? null;
  }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    ctx.resHeaders.append(
      "set-cookie",
      clearSessionCookie(ctx.req.headers),
    );
    return { success: true };
  }),
});
