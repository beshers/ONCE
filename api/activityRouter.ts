import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { activityLog, projects, codeSnippets, messages, projectCollaborators } from "@db/schema";
import { eq, and, desc, sql, gte } from "drizzle-orm";

export const activityRouter = createRouter({
  log: authedQuery
    .input(z.object({
      action: z.string(),
      entityType: z.string().optional(),
      entityId: z.number().optional(),
      details: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.insert(activityLog).values({
        userId: ctx.user.id,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        details: input.details,
      });
      return { success: true };
    }),

  recent: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db.select().from(activityLog)
      .where(eq(activityLog.userId, ctx.user.id))
      .orderBy(desc(activityLog.createdAt))
      .limit(50);
    return rows;
  }),

  dashboardStats: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const [projectCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(projects).where(eq(projects.ownerId, ctx.user.id));
    const [snippetCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(codeSnippets).where(eq(codeSnippets.userId, ctx.user.id));
    const [messageCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(messages)
      .where(and(eq(messages.senderId, ctx.user.id), gte(messages.createdAt, sql`DATE_SUB(NOW(), INTERVAL 30 DAY)`)));
    const [unreadMessages] = await db.select({ count: sql<number>`COUNT(*)` }).from(messages)
      .where(and(eq(messages.receiverId, ctx.user.id), eq(messages.isRead, false)));
    const collabCount = await db.select({ count: sql<number>`COUNT(DISTINCT projectId)` }).from(projectCollaborators).where(eq(projectCollaborators.userId, ctx.user.id));

    return {
      projects: projectCount?.count || 0,
      snippets: snippetCount?.count || 0,
      collaborating: collabCount[0]?.count || 0,
      unreadMessages: unreadMessages?.count || 0,
      messagesThisMonth: messageCount?.count || 0,
    };
  }),
});
