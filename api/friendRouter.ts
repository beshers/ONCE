import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { friends, users, notifications } from "@db/schema";
import { eq, and, or, desc, sql } from "drizzle-orm";

export const friendRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db.select().from(friends).where(
      or(eq(friends.requesterId, ctx.user.id), eq(friends.addresseeId, ctx.user.id))
    ).orderBy(desc(friends.updatedAt));
    const friendIds = rows.map((r) =>
      r.requesterId === ctx.user.id ? r.addresseeId : r.requesterId
    );
    if (!friendIds.length) return [];
    const friendUsers = await db.select({
      id: users.id,
      name: users.name,
      username: users.username,
      avatar: users.avatar,
      status: users.status,
    }).from(users).where(or(...friendIds.map((id) => eq(users.id, id))));
    return rows.map((r) => ({
      ...r,
      user: friendUsers.find((u) => u.id === (r.requesterId === ctx.user.id ? r.addresseeId : r.requesterId)),
    }));
  }),

  requests: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db.select({
      request: friends,
      user: { id: users.id, name: users.name, username: users.username, avatar: users.avatar },
    }).from(friends)
      .leftJoin(users, eq(friends.requesterId, users.id))
      .where(and(eq(friends.addresseeId, ctx.user.id), eq(friends.status, "pending")))
      .orderBy(desc(friends.createdAt));
    return rows;
  }),

  sendRequest: authedQuery
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      if (input.userId === ctx.user.id) throw new Error("Cannot friend yourself");
      const [existing] = await db
        .select()
        .from(friends)
        .where(
          or(
            and(eq(friends.requesterId, ctx.user.id), eq(friends.addresseeId, input.userId)),
            and(eq(friends.requesterId, input.userId), eq(friends.addresseeId, ctx.user.id)),
          ),
        )
        .limit(1);

      if (existing?.status === "accepted") {
        return { success: true, status: "accepted" };
      }

      if (existing?.status === "pending" && existing.addresseeId === ctx.user.id) {
        await db
          .update(friends)
          .set({ status: "accepted", updatedAt: new Date() })
          .where(eq(friends.id, existing.id));
        await db.insert(notifications).values({
          userId: existing.requesterId,
          type: "friend_accepted",
          title: "Friend request accepted",
          content: `${ctx.user.name || ctx.user.username} accepted your friend request`,
          actorId: ctx.user.id,
          entityType: "friend",
        });
        return { success: true, status: "accepted" };
      }

      if (existing?.status === "pending") {
        return { success: true, status: "pending" };
      }

      await db.insert(friends).values({
        requesterId: ctx.user.id,
        addresseeId: input.userId,
        status: "pending",
      });
      // Create notification
      await db.insert(notifications).values({
        userId: input.userId,
        type: "friend_request",
        title: "New friend request",
        content: `${ctx.user.name || ctx.user.username} wants to be your friend`,
        actorId: ctx.user.id,
        entityType: "friend",
      });
      return { success: true };
    }),

  accept: authedQuery
    .input(z.object({ friendId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [friend] = await db.select().from(friends).where(eq(friends.id, input.friendId));
      if (!friend || friend.addresseeId !== ctx.user.id) throw new Error("Access denied");
      await db.update(friends).set({ status: "accepted", updatedAt: new Date() }).where(eq(friends.id, input.friendId));
      // Create notification for requester
      await db.insert(notifications).values({
        userId: friend.requesterId,
        type: "friend_accepted",
        title: "Friend request accepted",
        content: `${ctx.user.name || ctx.user.username} accepted your friend request`,
        actorId: ctx.user.id,
        entityType: "friend",
      });
      return { success: true };
    }),

  reject: authedQuery
    .input(z.object({ friendId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [friend] = await db.select().from(friends).where(eq(friends.id, input.friendId));
      if (!friend || friend.addresseeId !== ctx.user.id) throw new Error("Access denied");
      await db.update(friends).set({ status: "blocked", updatedAt: new Date() }).where(eq(friends.id, input.friendId));
      return { success: true };
    }),

  remove: authedQuery
    .input(z.object({ friendId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [friend] = await db.select().from(friends).where(eq(friends.id, input.friendId));
      if (!friend) throw new Error("Not found");
      if (friend.requesterId !== ctx.user.id && friend.addresseeId !== ctx.user.id) throw new Error("Access denied");
      await db.delete(friends).where(eq(friends.id, input.friendId));
      return { success: true };
    }),

  searchUsers: authedQuery
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db.select({
        id: users.id,
        name: users.name,
        username: users.username,
        avatar: users.avatar,
        status: users.status,
      }).from(users)
        .where(and(
          or(
            sql`LOWER(${users.username}) LIKE LOWER(${'%' + input.query + '%'})`,
            sql`LOWER(${users.name}) LIKE LOWER(${'%' + input.query + '%'})`
          ),
          sql`${users.id} != ${ctx.user.id}`
        ))
        .limit(20);
      return rows;
    }),
});
