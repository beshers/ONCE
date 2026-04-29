import { z } from "zod";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { incrementUserStats } from "./queries/user-stats";
import { codeSnippets, users } from "@db/schema";
import { eq, desc, sql, like, and } from "drizzle-orm";

export const snippetRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db.select().from(codeSnippets).where(eq(codeSnippets.userId, ctx.user.id)).orderBy(desc(codeSnippets.createdAt));
    return rows;
  }),

  publicList: publicQuery.query(async () => {
    const db = getDb();
    const rows = await db.select({
      snippet: codeSnippets,
      author: { id: users.id, name: users.name, username: users.username, avatar: users.avatar },
    }).from(codeSnippets)
      .leftJoin(users, eq(codeSnippets.userId, users.id))
      .where(eq(codeSnippets.isPublic, true))
      .orderBy(desc(codeSnippets.createdAt))
      .limit(100);
    return rows;
  }),

  search: publicQuery
    .input(z.object({ query: z.string(), language: z.string().optional() }))
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [like(codeSnippets.title, `%${input.query}%`)];
      if (input.language) conditions.push(eq(codeSnippets.language, input.language));
      const rows = await db.select({
        snippet: codeSnippets,
        author: { id: users.id, name: users.name, username: users.username },
      }).from(codeSnippets)
        .leftJoin(users, eq(codeSnippets.userId, users.id))
        .where(and(...conditions))
        .orderBy(desc(codeSnippets.createdAt))
        .limit(50);
      return rows;
    }),

  get: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const [snippet] = await db.select().from(codeSnippets).where(eq(codeSnippets.id, input.id));
      if (!snippet) throw new Error("Snippet not found");
      if (!snippet.isPublic && snippet.userId !== ctx.user.id) throw new Error("Access denied");
      await db.update(codeSnippets).set({ views: sql`${codeSnippets.views} + 1` }).where(eq(codeSnippets.id, input.id));
      return snippet;
    }),

  create: authedQuery
    .input(z.object({
      title: z.string().min(1).max(100),
      language: z.string().default("plaintext"),
      code: z.string(),
      description: z.string().optional(),
      isPublic: z.boolean().default(true),
      tags: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [{ id }] = await db.insert(codeSnippets).values({
        userId: ctx.user.id,
        ...input,
      }).$returningId();
      await incrementUserStats(ctx.user.id, { snippetsShared: 1, xp: 25 });
      return { id, title: input.title };
    }),

  update: authedQuery
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).optional(),
      language: z.string().optional(),
      code: z.string().optional(),
      description: z.string().optional(),
      isPublic: z.boolean().optional(),
      tags: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;
      const [snippet] = await db.select().from(codeSnippets).where(eq(codeSnippets.id, id));
      if (!snippet || snippet.userId !== ctx.user.id) throw new Error("Access denied");
      await db.update(codeSnippets).set(data).where(eq(codeSnippets.id, id));
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [snippet] = await db.select().from(codeSnippets).where(eq(codeSnippets.id, input.id));
      if (!snippet || snippet.userId !== ctx.user.id) throw new Error("Access denied");
      await db.delete(codeSnippets).where(eq(codeSnippets.id, input.id));
      return { success: true };
    }),

  like: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(codeSnippets).set({ likes: sql`${codeSnippets.likes} + 1` }).where(eq(codeSnippets.id, input.id));
      return { success: true };
    }),
});
