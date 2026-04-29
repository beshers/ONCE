import { z } from "zod";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { incrementUserStats } from "./queries/user-stats";
import { socialPosts, socialComments, socialLikes, users } from "@db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export const socialRouter = createRouter({
  feed: publicQuery.query(async () => {
    const db = getDb();
    const rows = await db.select({
      post: socialPosts,
      author: { id: users.id, name: users.name, username: users.username, avatar: users.avatar },
    }).from(socialPosts)
      .leftJoin(users, eq(socialPosts.userId, users.id))
      .where(eq(socialPosts.isPublic, true))
      .orderBy(desc(socialPosts.createdAt))
      .limit(50);
    return rows;
  }),

  createPost: authedQuery
    .input(z.object({
      content: z.string().min(1),
      codeSnippet: z.string().optional(),
      language: z.string().optional(),
      projectId: z.number().optional(),
      isPublic: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [{ id }] = await db.insert(socialPosts).values({
        userId: ctx.user.id,
        ...input,
      }).$returningId();
      await incrementUserStats(ctx.user.id, { xp: 10 });
      return { id };
    }),

  comments: publicQuery
    .input(z.object({ postId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db.select({
        comment: socialComments,
        author: { id: users.id, name: users.name, username: users.username, avatar: users.avatar },
      }).from(socialComments)
        .leftJoin(users, eq(socialComments.userId, users.id))
        .where(eq(socialComments.postId, input.postId))
        .orderBy(desc(socialComments.createdAt));
      return rows;
    }),

  addComment: authedQuery
    .input(z.object({
      postId: z.number(),
      content: z.string().min(1),
      parentId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.insert(socialComments).values({
        postId: input.postId,
        userId: ctx.user.id,
        content: input.content,
        parentId: input.parentId || null,
      });
      await db.update(socialPosts).set({ comments: sql`${socialPosts.comments} + 1` }).where(eq(socialPosts.id, input.postId));
      return { success: true };
    }),

  likePost: authedQuery
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.insert(socialLikes).values({
        postId: input.postId,
        userId: ctx.user.id,
      }).onDuplicateKeyUpdate({ set: {} });
      await db.update(socialPosts).set({ likes: sql`${socialPosts.likes} + 1` }).where(eq(socialPosts.id, input.postId));
      return { success: true };
    }),

  unlikePost: authedQuery
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(socialLikes).where(
        and(eq(socialLikes.postId, input.postId), eq(socialLikes.userId, ctx.user.id))
      );
      await db.update(socialPosts).set({ likes: sql`GREATEST(${socialPosts.likes} - 1, 0)` }).where(eq(socialPosts.id, input.postId));
      return { success: true };
    }),
});
