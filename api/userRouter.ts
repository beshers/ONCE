import { z } from "zod";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users, userStats } from "@db/schema";
import { eq, sql, inArray } from "drizzle-orm";

export const userRouter = createRouter({
  me: authedQuery.query(async ({ ctx }) => {
    return ctx.user;
  }),

  profile: publicQuery
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [user] = await db.select({
        id: users.id,
        name: users.name,
        username: users.username,
        avatar: users.avatar,
        bio: users.bio,
        role: users.role,
        createdAt: users.createdAt,
      }).from(users).where(eq(users.id, input.userId));
      if (!user) throw new Error("User not found");
      const [stats] = await db.select().from(userStats).where(eq(userStats.userId, input.userId));
      return { user, stats };
    }),

  updateProfile: authedQuery
    .input(z.object({
      name: z.string().optional(),
      username: z.string().optional(),
      bio: z.string().optional(),
      avatar: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.update(users).set(input).where(eq(users.id, ctx.user.id));
      return { success: true };
    }),

  updateStatus: authedQuery
    .input(z.object({ status: z.enum(["online", "offline", "away", "busy"]) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.update(users).set({
        status: input.status,
        isOnline: input.status !== "offline",
        lastSeenAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(users.id, ctx.user.id));
      return { success: true };
    }),

  heartbeat: authedQuery
    .input(z.object({ status: z.enum(["online", "away", "busy"]).default("online") }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.update(users).set({
        status: input.status,
        isOnline: true,
        lastSeenAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(users.id, ctx.user.id));
      return { success: true, at: new Date().toISOString() };
    }),

  onlineUsers: publicQuery.query(async () => {
    const db = getDb();
    const rows = await db.select({
      id: users.id,
      name: users.name,
      username: users.username,
      avatar: users.avatar,
      status: users.status,
    }).from(users)
      .where(sql`${users.status} IN ('online', 'away')`)
      .limit(100);
    return rows;
  }),

  availability: publicQuery
    .input(z.object({ userIds: z.array(z.string()).min(1).max(100) }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db.select({
        id: users.id,
        status: users.status,
        lastSeenAt: users.lastSeenAt,
        isOnline: users.isOnline,
      }).from(users).where(inArray(users.id, input.userIds));
      return rows;
    }),

  search: publicQuery
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db.select({
        id: users.id,
        name: users.name,
        username: users.username,
        avatar: users.avatar,
        status: users.status,
      }).from(users)
        .where(sql`LOWER(${users.username}) LIKE LOWER(${'%' + input.query + '%'}) OR LOWER(${users.name}) LIKE LOWER(${'%' + input.query + '%'})`)
        .limit(20);
      return rows;
    }),
});
