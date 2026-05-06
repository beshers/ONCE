import { z } from "zod";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { incrementUserStats } from "./queries/user-stats";
import { friends, notifications, socialPosts, socialComments, socialLikes, users } from "@db/schema";
import { eq, and, desc, or, sql } from "drizzle-orm";

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

  favoriteFeed: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const favoriteRows = await db
      .select({ userId: friends.requesterId, otherUserId: friends.addresseeId })
      .from(friends)
      .where(
        and(
          eq(friends.status, "accepted"),
          or(
            and(eq(friends.requesterId, ctx.user.id), eq(friends.isFavoriteByRequester, true)),
            and(eq(friends.addresseeId, ctx.user.id), eq(friends.isFavoriteByAddressee, true)),
          ),
        ),
      );
    const favoriteIds = favoriteRows.map((friend) =>
      friend.userId === ctx.user.id ? friend.otherUserId : friend.userId,
    );
    if (favoriteIds.length === 0) return [];

    const rows = await db.select({
      post: socialPosts,
      author: { id: users.id, name: users.name, username: users.username, avatar: users.avatar },
    }).from(socialPosts)
      .leftJoin(users, eq(socialPosts.userId, users.id))
      .where(and(eq(socialPosts.isPublic, true), or(...favoriteIds.map((id) => eq(socialPosts.userId, id)))))
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
      const favoriteRows = await db
        .select({
          requesterId: friends.requesterId,
          addresseeId: friends.addresseeId,
        })
        .from(friends)
        .where(
          and(
            eq(friends.status, "accepted"),
            or(
              and(eq(friends.requesterId, ctx.user.id), eq(friends.isFavoriteByAddressee, true)),
              and(eq(friends.addresseeId, ctx.user.id), eq(friends.isFavoriteByRequester, true)),
            ),
          ),
        );
      const favoriteFollowers = favoriteRows
        .map((friend) => (friend.requesterId === ctx.user.id ? friend.addresseeId : friend.requesterId))
        .filter((userId) => userId !== ctx.user.id);
      if (favoriteFollowers.length > 0 && input.isPublic) {
        await db.insert(notifications).values(
          favoriteFollowers.map((userId) => ({
            userId,
            type: "system" as const,
            title: "Favorite friend posted",
            content: `${ctx.user.name || ctx.user.username} shared a new post in the social feed`,
            link: `/social?post=${id}`,
            actorId: ctx.user.id,
            entityId: id,
            entityType: "favorite_post",
          })),
        );
      }
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

  sharePost: authedQuery
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(socialPosts).set({ shares: sql`${socialPosts.shares} + 1` }).where(eq(socialPosts.id, input.postId));
      return { success: true };
    }),
});
