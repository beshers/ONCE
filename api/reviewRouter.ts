import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { incrementUserStats } from "./queries/user-stats";
import { codeReviews, users, projectFiles, projects } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";

export const reviewRouter = createRouter({
  list: authedQuery
    .input(z.object({ fileId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const [file] = await db.select().from(projectFiles).where(eq(projectFiles.id, input.fileId));
      if (!file) throw new Error("File not found");
      const [project] = await db.select().from(projects).where(eq(projects.id, file.projectId));
      const hasAccess = project.isPublic || project.ownerId === ctx.user.id || !!(await db.query.projectCollaborators.findFirst({
        where: and(eq(projects.id, file.projectId)),
      }));
      if (!hasAccess) throw new Error("Access denied");
      const rows = await db.select({
        review: codeReviews,
        author: { id: users.id, name: users.name, username: users.username, avatar: users.avatar },
      }).from(codeReviews)
        .leftJoin(users, eq(codeReviews.userId, users.id))
        .where(eq(codeReviews.fileId, input.fileId))
        .orderBy(desc(codeReviews.createdAt));
      return rows;
    }),

  create: authedQuery
    .input(z.object({
      projectId: z.number(),
      fileId: z.number(),
      lineStart: z.number().default(0),
      lineEnd: z.number().default(0),
      content: z.string().min(1),
      parentId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [{ id }] = await db.insert(codeReviews).values({
        projectId: input.projectId,
        fileId: input.fileId,
        userId: ctx.user.id,
        lineStart: input.lineStart,
        lineEnd: input.lineEnd,
        content: input.content,
        parentId: input.parentId || null,
      }).$returningId();
      await incrementUserStats(ctx.user.id, { codeReviewsDone: 1, xp: 30 });
      return { id };
    }),

  updateStatus: authedQuery
    .input(z.object({ id: z.number(), status: z.enum(["open", "resolved", "dismissed"]) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [review] = await db.select().from(codeReviews).where(eq(codeReviews.id, input.id));
      if (!review) throw new Error("Review not found");
      const [project] = await db.select().from(projects).where(eq(projects.id, review.projectId));
      const canModify = project.ownerId === ctx.user.id || review.userId === ctx.user.id || !!(await db.query.projectCollaborators.findFirst({
        where: and(
          eq(projects.id, review.projectId),
          eq(users.id, ctx.user.id),
        ),
      }));
      if (!canModify) throw new Error("Access denied");
      await db.update(codeReviews).set({ status: input.status, updatedAt: new Date() }).where(eq(codeReviews.id, input.id));
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [review] = await db.select().from(codeReviews).where(eq(codeReviews.id, input.id));
      if (!review || review.userId !== ctx.user.id) throw new Error("Access denied");
      await db.delete(codeReviews).where(eq(codeReviews.id, input.id));
      return { success: true };
    }),
});
