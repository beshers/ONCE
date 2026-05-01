import { z } from "zod";
import { observable } from "@trpc/server/observable";
import { EventEmitter } from "events";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { incrementUserStats } from "./queries/user-stats";
import { messages, chatRooms, chatRoomMembers, users, notifications, friends } from "@db/schema";
import { eq, and, desc, sql, or, gt, inArray } from "drizzle-orm";

const roomSettingsSchema = z.object({
  isPrivate: z.boolean().default(false),
  allowGuests: z.boolean().default(false),
  hasPermanentCall: z.boolean().default(false),
  pinnedSummary: z.string().optional(),
  expiresAt: z.string().optional(),
});

function parseRoomSettings(raw?: string | null) {
  if (!raw) return roomSettingsSchema.parse({});
  try {
    return roomSettingsSchema.parse(JSON.parse(raw));
  } catch {
    return roomSettingsSchema.parse({});
  }
}

function parseMessageMetadata(raw?: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function ensureRoomAccess(db: ReturnType<typeof getDb>, roomId: number, userId: string) {
  const [membership] = await db
    .select()
    .from(chatRoomMembers)
    .where(and(eq(chatRoomMembers.roomId, roomId), eq(chatRoomMembers.userId, userId)))
    .limit(1);

  if (!membership) {
    throw new Error("Access denied");
  }

  return membership;
}

async function ensureAcceptedFriendship(db: ReturnType<typeof getDb>, userId: string, friendId: string) {
  const [friendship] = await db
    .select({ id: friends.id })
    .from(friends)
    .where(
      and(
        eq(friends.status, "accepted"),
        or(
          and(eq(friends.requesterId, userId), eq(friends.addresseeId, friendId)),
          and(eq(friends.requesterId, friendId), eq(friends.addresseeId, userId)),
        ),
      ),
    )
    .limit(1);

  if (!friendship) {
    throw new Error("You can only message or call accepted friends.");
  }

  return friendship;
}

async function createChatNotification(
  db: ReturnType<typeof getDb>,
  userId: string,
  actorId: string,
  title: string,
  content: string,
  type: "mention" | "system" = "mention",
  entityType = "chat",
) {
  await db.insert(notifications).values({
    userId,
    type,
    title,
    content,
    actorId,
    entityType,
  });
}

type LiveMessageEvent = {
  id: number;
  roomId: string | null;
  receiverId: string | null;
  senderId: string;
};

type LiveTypingEvent = {
  roomId: string | null;
  receiverId: string | null;
  userId: string;
  username: string;
  isTyping: boolean;
};

type LivePresenceEvent = {
  userId: string;
  username: string;
  status: string;
  at: number;
};

type LiveRoomEvent = {
  id: number;
  name: string;
  type: string;
  createdBy: string;
};

type LiveIncomingCallEvent = {
  messageId: number;
  senderId: string;
  receiverId: string;
  content: string;
  metadata: Record<string, unknown>;
};

type ChatEventMap = {
  message: LiveMessageEvent;
  typing: LiveTypingEvent;
  presence: LivePresenceEvent;
  roomCreated: LiveRoomEvent;
  incomingCall: LiveIncomingCallEvent;
};

const chatGlobal = globalThis as typeof globalThis & {
  __phpBackendChatEvents?: EventEmitter;
  __phpBackendTypingTimers?: Map<string, ReturnType<typeof setTimeout>>;
};

const chatEvents = chatGlobal.__phpBackendChatEvents ?? new EventEmitter();
chatEvents.setMaxListeners(200);
chatGlobal.__phpBackendChatEvents = chatEvents;

const typingTimers = chatGlobal.__phpBackendTypingTimers ?? new Map<string, ReturnType<typeof setTimeout>>();
chatGlobal.__phpBackendTypingTimers = typingTimers;

function emitChatEvent<K extends keyof ChatEventMap>(event: K, payload: ChatEventMap[K]) {
  chatEvents.emit(event, payload);
}

function directPairKey(userA: string, userB: string) {
  return [String(userA), String(userB)].sort().join("::");
}

function typingTimerKey(roomId: string | null, receiverId: string | null, userId: string) {
  return `${roomId ?? "dm"}::${receiverId ?? "global"}::${userId}`;
}

function clearTypingTimer(roomId: string | null, receiverId: string | null, userId: string) {
  const key = typingTimerKey(roomId, receiverId, userId);
  const timer = typingTimers.get(key);
  if (timer) {
    clearTimeout(timer);
    typingTimers.delete(key);
  }
}

function scheduleTypingTimeout(event: LiveTypingEvent) {
  clearTypingTimer(event.roomId, event.receiverId, event.userId);
  const key = typingTimerKey(event.roomId, event.receiverId, event.userId);
  const timer = setTimeout(() => {
    typingTimers.delete(key);
    emitChatEvent("typing", { ...event, isTyping: false });
  }, 3000);
  typingTimers.set(key, timer);
}

function matchesDirectEvent(currentUserId: string, otherUserId: string, senderId: string, receiverId: string | null) {
  if (!receiverId) return false;
  return directPairKey(currentUserId, otherUserId) === directPairKey(senderId, receiverId);
}

export const chatRouter = createRouter({
  rooms: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const memberships = await db
      .select()
      .from(chatRoomMembers)
      .where(eq(chatRoomMembers.userId, ctx.user.id));
    const roomIds = memberships.map((m) => m.roomId);
    if (!roomIds.length) return [];

    const rooms = await db
      .select({
        room: chatRooms,
        creator: {
          id: users.id,
          name: users.name,
          username: users.username,
          avatar: users.avatar,
        },
      })
      .from(chatRooms)
      .leftJoin(users, eq(chatRooms.createdBy, users.id))
      .where(inArray(chatRooms.id, roomIds));

    return rooms.map(({ room, creator }) => ({
      ...room,
      creator,
      settings: parseRoomSettings(room.description),
    }));
  }),

  publicRooms: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const memberships = await db
      .select({ roomId: chatRoomMembers.roomId })
      .from(chatRoomMembers)
      .where(eq(chatRoomMembers.userId, ctx.user.id));
    const joinedIds = new Set(memberships.map((membership) => Number(membership.roomId)));

    const rows = await db
      .select({
        room: chatRooms,
        creator: {
          id: users.id,
          name: users.name,
          username: users.username,
          avatar: users.avatar,
        },
      })
      .from(chatRooms)
      .leftJoin(users, eq(chatRooms.createdBy, users.id))
      .where(eq(chatRooms.isPrivate, false))
      .limit(50);

    return rows
      .map(({ room, creator }) => ({
        ...room,
        creator,
        joined: joinedIds.has(Number(room.id)),
        settings: parseRoomSettings(room.description),
      }))
      .filter((room) => !room.joined);
  }),

  directThreads: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const acceptedFriends = await db
      .select()
      .from(friends)
      .where(
        and(
          eq(friends.status, "accepted"),
          or(eq(friends.requesterId, ctx.user.id), eq(friends.addresseeId, ctx.user.id)),
        ),
      )
      .orderBy(desc(friends.updatedAt));
    const acceptedFriendIds = acceptedFriends.map((friend) =>
      String(friend.requesterId) === String(ctx.user.id)
        ? String(friend.addresseeId)
        : String(friend.requesterId),
    );

    const rows = await db
      .select({
        message: messages,
        sender: { id: users.id, name: users.name, username: users.username, avatar: users.avatar, status: users.status },
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(
        and(
          sql`${messages.roomId} IS NULL`,
          or(eq(messages.senderId, ctx.user.id), eq(messages.receiverId, ctx.user.id)),
        ),
      )
      .orderBy(desc(messages.createdAt))
      .limit(500);

    const threadMap = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      const counterpartId =
        String(row.message.senderId) === String(ctx.user.id)
          ? String(row.message.receiverId)
          : String(row.message.senderId);
      if (!counterpartId || counterpartId === "null") continue;
      if (!threadMap.has(counterpartId)) {
        threadMap.set(counterpartId, row);
      }
    }

    const counterpartIds = [...new Set([...acceptedFriendIds, ...threadMap.keys()])];
    if (!counterpartIds.length) return [];

    const people = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        avatar: users.avatar,
        status: users.status,
      })
      .from(users)
      .where(inArray(users.id, counterpartIds));

    const unreadRows = await db
      .select({
        senderId: messages.senderId,
        count: sql<number>`COUNT(*)`,
      })
      .from(messages)
      .where(
        and(
          eq(messages.receiverId, ctx.user.id),
          eq(messages.isRead, false),
          sql`${messages.roomId} IS NULL`,
        ),
      )
      .groupBy(messages.senderId);

    const unreadMap = new Map(unreadRows.map((row) => [String(row.senderId), row.count]));

    return counterpartIds.map((id) => {
      const latest = threadMap.get(id);
      const person = people.find((candidate) => String(candidate.id) === id);
      const metadata = latest ? parseMessageMetadata(latest.message.metadata) : null;
      const friendship = acceptedFriends.find((friend) =>
        String(friend.requesterId) === id || String(friend.addresseeId) === id,
      );
      return {
        user: person,
        latestMessage: latest?.message ?? null,
        latestSender: latest?.sender ?? null,
        latestMetadata: metadata,
        friendship,
        isFriend: Boolean(friendship),
        unreadCount: unreadMap.get(id) || 0,
      };
    }).filter((thread) => thread.user);
  }),

  createRoom: authedQuery
    .input(
      z.object({
        name: z.string().min(1),
        type: z.enum(["direct", "group", "project"]).default("group"),
        projectId: z.number().optional(),
        memberIds: z.array(z.string()).default([]),
        settings: roomSettingsSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const settings = input.settings ? roomSettingsSchema.parse(input.settings) : roomSettingsSchema.parse({});
      const [{ id }] = await db
        .insert(chatRooms)
        .values({
          name: input.name,
          type: input.type,
          projectId: input.projectId,
          createdBy: ctx.user.id,
          isPrivate: settings.isPrivate,
          description: JSON.stringify(settings),
        })
        .$returningId();

      await db.insert(chatRoomMembers).values({
        roomId: id,
        userId: ctx.user.id,
        role: "owner",
      });

      for (const userId of input.memberIds) {
        await db
          .insert(chatRoomMembers)
          .values({ roomId: id, userId, role: "member" })
          .onDuplicateKeyUpdate({ set: { role: "member" } });

        await createChatNotification(
          db,
          userId,
          ctx.user.id,
          "Room invite",
          `${ctx.user.name || ctx.user.username} added you to ${input.name}`,
          "system",
          "chat_room",
        );
      }

      emitChatEvent("roomCreated", {
        id,
        name: input.name,
        type: input.type,
        createdBy: String(ctx.user.id),
      });

      return { id, name: input.name };
    }),

  roomMembers: authedQuery
    .input(z.object({ roomId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      await ensureRoomAccess(db, input.roomId, ctx.user.id);
      const rows = await db
        .select({
          member: chatRoomMembers,
          user: { id: users.id, name: users.name, username: users.username, avatar: users.avatar, status: users.status },
        })
        .from(chatRoomMembers)
        .leftJoin(users, eq(chatRoomMembers.userId, users.id))
        .where(eq(chatRoomMembers.roomId, input.roomId));
      return rows;
    }),

  roomSettings: authedQuery
    .input(z.object({ roomId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      await ensureRoomAccess(db, input.roomId, ctx.user.id);
      const [row] = await db
        .select({
          room: chatRooms,
          creator: {
            id: users.id,
            name: users.name,
            username: users.username,
            avatar: users.avatar,
          },
        })
        .from(chatRooms)
        .leftJoin(users, eq(chatRooms.createdBy, users.id))
        .where(eq(chatRooms.id, input.roomId))
        .limit(1);
      const room = row?.room;
      if (!room) throw new Error("Room not found");
      return { room, creator: row.creator, settings: parseRoomSettings(room.description) };
    }),

  updateRoomSettings: authedQuery
    .input(
      z.object({
        roomId: z.number(),
        settings: roomSettingsSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const membership = await ensureRoomAccess(db, input.roomId, ctx.user.id);
      if (!["owner", "admin"].includes(membership.role || "member")) {
        throw new Error("Only owners/admins can update room settings");
      }

      await db
        .update(chatRooms)
        .set({
          isPrivate: input.settings.isPrivate,
          description: JSON.stringify(input.settings),
        })
        .where(eq(chatRooms.id, input.roomId));
      return { success: true };
    }),

  inviteToRoom: authedQuery
    .input(z.object({ roomId: z.number(), userId: z.string(), role: z.string().default("member") }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const membership = await ensureRoomAccess(db, input.roomId, ctx.user.id);
      if (!["owner", "admin"].includes(membership.role || "member")) {
        throw new Error("Only owners/admins can invite members");
      }

      await db
        .insert(chatRoomMembers)
        .values({ roomId: input.roomId, userId: input.userId, role: input.role })
        .onDuplicateKeyUpdate({ set: { role: input.role } });

      const [room] = await db.select().from(chatRooms).where(eq(chatRooms.id, input.roomId)).limit(1);
      await createChatNotification(
        db,
        input.userId,
        ctx.user.id,
        "Room invite",
        `${ctx.user.name || ctx.user.username} added you to ${room?.name || "a room"}`,
        "system",
        "chat_room",
      );
      return { success: true };
    }),

  removeFromRoom: authedQuery
    .input(z.object({ roomId: z.number(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const membership = await ensureRoomAccess(db, input.roomId, ctx.user.id);
      if (!["owner", "admin"].includes(membership.role || "member")) {
        throw new Error("Only owners/admins can remove members");
      }

      await db
        .delete(chatRoomMembers)
        .where(and(eq(chatRoomMembers.roomId, input.roomId), eq(chatRoomMembers.userId, input.userId)));
      return { success: true };
    }),

  updateMemberRole: authedQuery
    .input(z.object({ roomId: z.number(), userId: z.string(), role: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const membership = await ensureRoomAccess(db, input.roomId, ctx.user.id);
      if (membership.role !== "owner") {
        throw new Error("Only owners can change member roles");
      }

      await db
        .update(chatRoomMembers)
        .set({ role: input.role })
        .where(and(eq(chatRoomMembers.roomId, input.roomId), eq(chatRoomMembers.userId, input.userId)));
      return { success: true };
    }),

  joinRoom: authedQuery
    .input(z.object({ roomId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [room] = await db.select().from(chatRooms).where(eq(chatRooms.id, input.roomId)).limit(1);
      if (!room) {
        throw new Error("Room not found");
      }

      const settings = parseRoomSettings(room.description);
      if (room.isPrivate && !settings.allowGuests) {
        throw new Error("This room is private. Ask the room creator for an invite.");
      }

      await db
        .insert(chatRoomMembers)
        .values({ roomId: input.roomId, userId: ctx.user.id, role: "member" })
        .onDuplicateKeyUpdate({ set: { role: "member" } });
      return { success: true };
    }),

  messages: authedQuery
    .input(
      z.object({
        roomId: z.string().optional(),
        receiverId: z.string().optional(),
        since: z.number().default(0),
        limit: z.number().default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const conditions = [];

      if (input.roomId) {
        if (input.roomId !== "global") {
          await ensureRoomAccess(db, Number(input.roomId), ctx.user.id);
        }
        conditions.push(eq(messages.roomId, input.roomId));
      } else if (input.receiverId) {
        const receiverId = input.receiverId;
        conditions.push(
          sql`(
            (${messages.senderId} = ${ctx.user.id} AND ${messages.receiverId} = ${receiverId})
            OR (${messages.senderId} = ${receiverId} AND ${messages.receiverId} = ${ctx.user.id})
          )`,
        );
      } else {
        conditions.push(eq(messages.roomId, "global"));
      }

      if (input.since > 0) {
        conditions.push(gt(messages.id, input.since));
      }

      const rows = await db
        .select({
          message: messages,
          sender: { id: users.id, name: users.name, username: users.username, avatar: users.avatar },
        })
        .from(messages)
        .leftJoin(users, eq(messages.senderId, users.id))
        .where(and(...conditions))
        .orderBy(desc(messages.createdAt))
        .limit(input.limit);

      if (input.receiverId) {
        await db
          .update(messages)
          .set({ isRead: true })
          .where(
            and(
              eq(messages.senderId, input.receiverId),
              eq(messages.receiverId, ctx.user.id),
              eq(messages.isRead, false),
            ),
          );
      }

      return rows.reverse();
    }),

  searchMessages: authedQuery
    .input(
      z.object({
        query: z.string().min(1),
        roomId: z.string().optional(),
        receiverId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const conditions = [
        sql`LOWER(${messages.content}) LIKE LOWER(${"%" + input.query + "%"})`,
      ];

      if (input.roomId) {
        if (input.roomId !== "global") {
          await ensureRoomAccess(db, Number(input.roomId), ctx.user.id);
        }
        conditions.push(eq(messages.roomId, input.roomId));
      } else if (input.receiverId) {
        const receiverId = input.receiverId;
        conditions.push(
          sql`(
            (${messages.senderId} = ${ctx.user.id} AND ${messages.receiverId} = ${receiverId})
            OR (${messages.senderId} = ${receiverId} AND ${messages.receiverId} = ${ctx.user.id})
          )`,
        );
      } else {
        conditions.push(eq(messages.roomId, "global"));
      }

      const rows = await db
        .select({
          message: messages,
          sender: { id: users.id, name: users.name, username: users.username, avatar: users.avatar },
        })
        .from(messages)
        .leftJoin(users, eq(messages.senderId, users.id))
        .where(and(...conditions))
        .orderBy(desc(messages.createdAt))
        .limit(100);

      return rows;
    }),

  sendTyping: authedQuery
    .input(z.object({ roomId: z.string().optional(), receiverId: z.string().optional(), isTyping: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const roomId = input.receiverId ? null : input.roomId || "global";
      const receiverId = input.receiverId || null;
      const event: LiveTypingEvent = {
        roomId,
        receiverId,
        userId: String(ctx.user.id),
        username: ctx.user.name || ctx.user.username || ctx.user.email,
        isTyping: input.isTyping,
      };

      clearTypingTimer(roomId, receiverId, String(ctx.user.id));
      emitChatEvent("typing", event);
      if (input.isTyping) {
        scheduleTypingTimeout(event);
      }

      return { success: true };
    }),

  presencePing: authedQuery
    .input(z.object({ status: z.string().default("online") }).optional())
    .mutation(({ ctx, input }) => {
      emitChatEvent("presence", {
        userId: String(ctx.user.id),
        username: ctx.user.name || ctx.user.username || ctx.user.email,
        status: input?.status || "online",
        at: Date.now(),
      });
      return { success: true };
    }),

  send: authedQuery
    .input(
      z.object({
        content: z.string().min(1),
        roomId: z.string().optional(),
        receiverId: z.string().optional(),
        messageType: z.enum(["text", "code", "file", "image", "voice"]).default("text"),
        metadata: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      if (input.roomId && input.roomId !== "global") {
        await ensureRoomAccess(db, Number(input.roomId), ctx.user.id);
      }
      if (input.receiverId) {
        await ensureAcceptedFriendship(db, ctx.user.id, input.receiverId);
      }

      const storedRoomId = input.receiverId ? null : input.roomId || "global";
      const storedReceiverId = input.receiverId || null;

      const [{ id }] = await db
        .insert(messages)
        .values({
          senderId: ctx.user.id,
          receiverId: storedReceiverId,
          roomId: storedRoomId,
          content: input.content,
          messageType: input.messageType,
          metadata: input.metadata,
        })
        .$returningId();

      await incrementUserStats(ctx.user.id, { messagesSent: 1, xp: 5 });

      clearTypingTimer(storedRoomId, storedReceiverId, String(ctx.user.id));
      emitChatEvent("typing", {
        roomId: storedRoomId,
        receiverId: storedReceiverId,
        userId: String(ctx.user.id),
        username: ctx.user.name || ctx.user.username || ctx.user.email,
        isTyping: false,
      });

      if (input.receiverId && input.receiverId !== ctx.user.id) {
        const metadata = parseMessageMetadata(input.metadata);
        const isCallOffer = metadata?.kind === "call" && metadata?.action === "offer";
        await createChatNotification(
          db,
          input.receiverId,
          ctx.user.id,
          isCallOffer ? "Incoming call" : "New direct message",
          isCallOffer
            ? `${ctx.user.name || ctx.user.username} is calling you`
            : `${ctx.user.name || ctx.user.username}: ${input.content.slice(0, 120)}`,
          isCallOffer ? "system" : "mention",
          isCallOffer ? "chat_call" : "chat_dm",
        );
        if (isCallOffer) {
          emitChatEvent("incomingCall", {
            messageId: id,
            senderId: String(ctx.user.id),
            receiverId: String(input.receiverId),
            content: input.content,
            metadata: metadata || {},
          });
        }
      }

      emitChatEvent("message", {
        id,
        roomId: storedRoomId,
        receiverId: storedReceiverId,
        senderId: String(ctx.user.id),
      });

      return { id };
    }),

  markThreadRead: authedQuery
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .update(messages)
        .set({ isRead: true })
        .where(
          and(
            eq(messages.senderId, input.userId),
            eq(messages.receiverId, ctx.user.id),
            eq(messages.isRead, false),
          ),
        );
      return { success: true };
    }),

  markRead: authedQuery
    .input(z.object({ messageIds: z.array(z.number()) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      if (input.messageIds.length) {
        await db.update(messages).set({ isRead: true }).where(inArray(messages.id, input.messageIds));
      }
      return { success: true };
    }),

  unreadCount: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(messages)
      .where(and(eq(messages.receiverId, ctx.user.id), eq(messages.isRead, false)));
    return result[0]?.count || 0;
  }),

  onMessage: authedQuery
    .input(z.object({ roomId: z.string().optional(), receiverId: z.string().optional() }))
    .subscription(({ ctx, input }) =>
      observable<LiveMessageEvent>((emit) => {
        const handler = (event: LiveMessageEvent) => {
          if (input.roomId && event.roomId === input.roomId) {
            emit.next(event);
            return;
          }

          if (input.receiverId && matchesDirectEvent(String(ctx.user.id), input.receiverId, event.senderId, event.receiverId)) {
            emit.next(event);
          }
        };

        chatEvents.on("message", handler);
        return () => chatEvents.off("message", handler);
      }),
    ),

  onTyping: authedQuery
    .input(z.object({ roomId: z.string().optional(), receiverId: z.string().optional() }))
    .subscription(({ ctx, input }) =>
      observable<LiveTypingEvent>((emit) => {
        const handler = (event: LiveTypingEvent) => {
          if (input.roomId && event.roomId === input.roomId) {
            emit.next(event);
            return;
          }

          if (input.receiverId && matchesDirectEvent(String(ctx.user.id), input.receiverId, event.userId, event.receiverId)) {
            emit.next(event);
          }
        };

        chatEvents.on("typing", handler);
        return () => chatEvents.off("typing", handler);
      }),
    ),

  onPresence: authedQuery.subscription(() =>
    observable<LivePresenceEvent>((emit) => {
      const handler = (event: LivePresenceEvent) => emit.next(event);
      chatEvents.on("presence", handler);
      return () => chatEvents.off("presence", handler);
    }),
  ),

  onRoomCreated: authedQuery.subscription(() =>
    observable<LiveRoomEvent>((emit) => {
      const handler = (event: LiveRoomEvent) => emit.next(event);
      chatEvents.on("roomCreated", handler);
      return () => chatEvents.off("roomCreated", handler);
    }),
  ),

  onIncomingCall: authedQuery.subscription(({ ctx }) =>
    observable<LiveIncomingCallEvent>((emit) => {
      const handler = (event: LiveIncomingCallEvent) => {
        if (String(event.receiverId) === String(ctx.user.id)) {
          emit.next(event);
        }
      };
      chatEvents.on("incomingCall", handler);
      return () => chatEvents.off("incomingCall", handler);
    }),
  ),
});
