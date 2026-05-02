import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  int,
  boolean,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

export const users = mysqlTable(
  "users",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    username: varchar("username", { length: 50 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }),
    name: varchar("full_name", { length: 100 }).notNull(),
    firstName: varchar("first_name", { length: 50 }),
    lastName: varchar("last_name", { length: 50 }),
    avatar: varchar("avatar", { length: 255 }),
    bio: text("bio"),
    programmingLanguages: text("programming_languages"),
    role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
    status: mysqlEnum("status", ["online", "offline", "away", "busy"])
      .default("offline")
      .notNull(),
    isOnline: boolean("is_online").default(false).notNull(),
    lastSeenAt: timestamp("last_seen"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    lastSignInAt: timestamp("last_login_at"),
  },
  (table) => ({
    usernameIdx: uniqueIndex("users_username_unique").on(table.username),
    emailIdx: uniqueIndex("users_email_unique").on(table.email),
    statusIdx: index("users_status_idx").on(table.status),
  }),
);

export const userStats = mysqlTable(
  "user_stats",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    xp: int("xp").default(0).notNull(),
    level: int("level").default(1).notNull(),
    projectsCreated: int("projects_created").default(0).notNull(),
    projectsCollaborated: int("projects_collaborated").default(0).notNull(),
    snippetsShared: int("snippets_shared").default(0).notNull(),
    codeReviewsDone: int("code_reviews_done").default(0).notNull(),
    messagesSent: int("messages_sent").default(0).notNull(),
    totalCodingTime: int("total_coding_time").default(0).notNull(),
    streakDays: int("streak_days").default(0).notNull(),
    longestStreak: int("longest_streak").default(0).notNull(),
    lastActiveDate: timestamp("last_active_date"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: uniqueIndex("user_stats_user_id_unique").on(table.userId),
  }),
);

export const badges = mysqlTable("badges", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 100 }),
  color: varchar("color", { length: 50 }).default("#00d4ff"),
  requirementType: varchar("requirement_type", { length: 50 }).notNull(),
  requirementValue: int("requirement_value").default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userBadges = mysqlTable(
  "user_badges",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    badgeId: int("badge_id").notNull(),
    earnedAt: timestamp("earned_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueBadge: uniqueIndex("user_badges_user_badge_unique").on(
      table.userId,
      table.badgeId,
    ),
  }),
);

export const projects = mysqlTable(
  "projects",
  {
    id: serial("id").primaryKey(),
    ownerId: varchar("owner_id", { length: 255 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    language: varchar("language", { length: 50 }).default("plaintext"),
    isPublic: boolean("is_public").default(true).notNull(),
    aiAgentEnabled: boolean("ai_agent_enabled").default(false).notNull(),
    localFilesEnabled: boolean("local_files_enabled").default(false).notNull(),
    collaborationMode: mysqlEnum("collaboration_mode", ["solo", "team", "public"])
      .default("solo")
      .notNull(),
    code: text("code"),
    stars: int("stars").default(0).notNull(),
    forks: int("forks").default(0).notNull(),
    views: int("views").default(0).notNull(),
    status: mysqlEnum("status", ["active", "archived", "draft"])
      .default("active")
      .notNull(),
    tags: text("tags"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    ownerIdx: index("projects_owner_id_idx").on(table.ownerId),
    publicIdx: index("projects_public_idx").on(table.isPublic),
  }),
);

export const projectFiles = mysqlTable(
  "project_files",
  {
    id: serial("id").primaryKey(),
    projectId: int("project_id").notNull(),
    parentId: int("parent_id"),
    name: varchar("name", { length: 255 }).notNull(),
    type: mysqlEnum("type", ["file", "folder"]).default("file").notNull(),
    content: text("content"),
    language: varchar("language", { length: 50 }).default("plaintext"),
    size: int("size").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("project_files_project_id_idx").on(table.projectId),
  }),
);

export const projectCollaborators = mysqlTable(
  "project_collaborators",
  {
    id: serial("id").primaryKey(),
    projectId: int("project_id").notNull(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    role: mysqlEnum("role", ["owner", "editor", "viewer"])
      .default("viewer")
      .notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
    lastActiveAt: timestamp("last_active_at"),
  },
  (table) => ({
    uniqueCollab: uniqueIndex("project_collaborators_project_user_unique").on(
      table.projectId,
      table.userId,
    ),
  }),
);

export const projectVersions = mysqlTable(
  "project_versions",
  {
    id: serial("id").primaryKey(),
    projectId: int("project_id").notNull(),
    fileId: int("file_id").notNull(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    content: text("content"),
    commitMessage: varchar("commit_message", { length: 255 }),
    versionNumber: int("version_number").default(1).notNull(),
    diffSummary: text("diff_summary"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    fileIdx: index("project_versions_file_id_idx").on(table.fileId),
    projectFileIdx: index("project_versions_project_file_idx").on(
      table.projectId,
      table.fileId,
    ),
  }),
);

export const codeSnippets = mysqlTable(
  "code_snippets",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    title: varchar("title", { length: 100 }).notNull(),
    language: varchar("language", { length: 50 }).default("plaintext").notNull(),
    code: text("code").notNull(),
    description: text("description"),
    isPublic: boolean("is_public").default(true).notNull(),
    likes: int("likes").default(0).notNull(),
    forks: int("forks").default(0).notNull(),
    views: int("views").default(0).notNull(),
    tags: text("tags"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("code_snippets_user_id_idx").on(table.userId),
    publicIdx: index("code_snippets_public_idx").on(table.isPublic),
  }),
);

export const codeReviews = mysqlTable(
  "code_reviews",
  {
    id: serial("id").primaryKey(),
    projectId: int("project_id").notNull(),
    fileId: int("file_id").notNull(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    lineStart: int("line_start").default(0).notNull(),
    lineEnd: int("line_end").default(0).notNull(),
    content: text("content").notNull(),
    status: mysqlEnum("status", ["open", "resolved", "dismissed"])
      .default("open")
      .notNull(),
    parentId: int("parent_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    fileIdx: index("code_reviews_file_id_idx").on(table.fileId),
  }),
);

export const messages = mysqlTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    senderId: varchar("sender_id", { length: 255 }).notNull(),
    receiverId: varchar("receiver_id", { length: 255 }),
    projectId: int("project_id"),
    roomId: varchar("room_id", { length: 100 }),
    content: text("message").notNull(),
    messageType: mysqlEnum("message_type", [
      "text",
      "code",
      "file",
      "image",
      "voice",
    ])
      .default("text")
      .notNull(),
    metadata: text("metadata"),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    senderIdx: index("messages_sender_id_idx").on(table.senderId),
    receiverIdx: index("messages_receiver_id_idx").on(table.receiverId),
    roomIdx: index("messages_room_id_idx").on(table.roomId),
  }),
);

export const chatCalls = mysqlTable(
  "chat_calls",
  {
    id: serial("id").primaryKey(),
    callId: varchar("call_id", { length: 128 }).notNull(),
    callerId: varchar("caller_id", { length: 255 }).notNull(),
    receiverId: varchar("receiver_id", { length: 255 }).notNull(),
    mode: mysqlEnum("mode", ["voice", "video"]).default("voice").notNull(),
    status: mysqlEnum("status", ["ringing", "accepted", "rejected", "missed", "ended", "failed"])
      .default("ringing")
      .notNull(),
    offerMessageId: int("offer_message_id"),
    answeredAt: timestamp("answered_at"),
    endedAt: timestamp("ended_at"),
    lastSignalAt: timestamp("last_signal_at").defaultNow().notNull(),
    failureReason: text("failure_reason"),
    metadata: text("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    callIdIdx: uniqueIndex("chat_calls_call_id_unique").on(table.callId),
    callerIdx: index("chat_calls_caller_id_idx").on(table.callerId),
    receiverIdx: index("chat_calls_receiver_id_idx").on(table.receiverId),
    statusIdx: index("chat_calls_status_idx").on(table.status),
  }),
);

export const chatRooms = mysqlTable("chat_rooms", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  type: mysqlEnum("type", ["direct", "group", "project"])
    .default("group")
    .notNull(),
  projectId: int("project_id"),
  isPrivate: boolean("is_private").default(false).notNull(),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatRoomMembers = mysqlTable(
  "chat_room_members",
  {
    roomId: int("chat_room_id").notNull(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
    role: varchar("role", { length: 20 }).default("member"),
    lastReadAt: timestamp("last_read_at"),
  },
  (table) => ({
    pk: primaryKey({
      name: "chat_room_members_pk",
      columns: [table.roomId, table.userId],
    }),
  }),
);

export const friends = mysqlTable(
  "friends",
  {
    id: serial("id").primaryKey(),
    requesterId: varchar("requester_id", { length: 255 }).notNull(),
    addresseeId: varchar("addressee_id", { length: 255 }).notNull(),
    status: mysqlEnum("status", ["pending", "accepted", "blocked"])
      .default("pending")
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueFriend: uniqueIndex("friends_requester_addressee_unique").on(
      table.requesterId,
      table.addresseeId,
    ),
  }),
);

export const notifications = mysqlTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    type: mysqlEnum("type", [
      "friend_request",
      "friend_accepted",
      "project_invite",
      "project_update",
      "code_review",
      "mention",
      "badge_earned",
      "system",
    ]).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    content: text("content"),
    link: varchar("link", { length: 500 }),
    actorId: varchar("actor_id", { length: 255 }),
    entityId: int("entity_id"),
    entityType: varchar("entity_type", { length: 50 }),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userReadIdx: index("notifications_user_read_idx").on(
      table.userId,
      table.isRead,
    ),
  }),
);

export const activityLog = mysqlTable(
  "activity_log",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 255 }),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 50 }),
    entityId: int("entity_id"),
    details: text("details"),
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("activity_log_user_id_idx").on(table.userId),
  }),
);

export const terminalSessions = mysqlTable(
  "terminal_sessions",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    projectId: int("project_id"),
    name: varchar("name", { length: 100 }).default("Terminal"),
    currentPath: varchar("current_path", { length: 500 }).default("~"),
    history: text("session_data"),
    environment: text("environment"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    lastActiveAt: timestamp("last_active_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("terminal_sessions_user_id_idx").on(table.userId),
  }),
);

export const socialPosts = mysqlTable(
  "social_posts",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    content: text("content").notNull(),
    codeSnippet: text("code_snippet"),
    language: varchar("language", { length: 50 }),
    projectId: int("project_id"),
    likes: int("likes").default(0).notNull(),
    comments: int("comments").default(0).notNull(),
    shares: int("shares").default(0).notNull(),
    isPublic: boolean("is_public").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("social_posts_user_id_idx").on(table.userId),
  }),
);

export const socialComments = mysqlTable(
  "social_comments",
  {
    id: serial("id").primaryKey(),
    postId: int("post_id").notNull(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    content: text("content").notNull(),
    parentId: int("parent_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    postIdx: index("social_comments_post_id_idx").on(table.postId),
  }),
);

export const socialLikes = mysqlTable(
  "social_likes",
  {
    id: serial("id").primaryKey(),
    postId: int("post_id").notNull(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueLike: uniqueIndex("social_likes_post_user_unique").on(
      table.postId,
      table.userId,
    ),
  }),
);

export const usersRelations = relations(users, ({ one, many }) => ({
  stats: one(userStats, {
    fields: [users.id],
    references: [userStats.userId],
  }),
  projects: many(projects),
  snippets: many(codeSnippets),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
  }),
  files: many(projectFiles),
  collaborators: many(projectCollaborators),
}));

export const projectFilesRelations = relations(projectFiles, ({ one, many }) => ({
  project: one(projects, {
    fields: [projectFiles.projectId],
    references: [projects.id],
  }),
  versions: many(projectVersions),
  reviews: many(codeReviews),
}));

export const codeSnippetsRelations = relations(codeSnippets, ({ one }) => ({
  author: one(users, {
    fields: [codeSnippets.userId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type ProjectFile = typeof projectFiles.$inferSelect;
export type ProjectCollaborator = typeof projectCollaborators.$inferSelect;
export type ProjectVersion = typeof projectVersions.$inferSelect;
export type CodeSnippet = typeof codeSnippets.$inferSelect;
export type CodeReview = typeof codeReviews.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type ChatRoom = typeof chatRooms.$inferSelect;
export type ChatRoomMember = typeof chatRoomMembers.$inferSelect;
export type Friend = typeof friends.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type ActivityLog = typeof activityLog.$inferSelect;
export type UserStats = typeof userStats.$inferSelect;
export type Badge = typeof badges.$inferSelect;
export type UserBadge = typeof userBadges.$inferSelect;
export type SocialPost = typeof socialPosts.$inferSelect;
export type SocialComment = typeof socialComments.$inferSelect;
export type TerminalSession = typeof terminalSessions.$inferSelect;

// ===== NEW FEATURES SCHEMA =====

// Activity Heatmaps
export const activityHeatmaps = mysqlTable(
  "activity_heatmaps",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    date: varchar("date", { length: 10 }).notNull(),
    activityCount: int("activity_count").default(0).notNull(),
    codingMinutes: int("coding_minutes").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userDateIdx: uniqueIndex("activity_heatmaps_user_date_unique").on(table.userId, table.date),
  }),
);

// Virtual Hackathon Modules
export const hackathons = mysqlTable(
  "hackathons",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date").notNull(),
    status: mysqlEnum("status", ["upcoming", "active", "completed", "cancelled"])
      .default("upcoming")
      .notNull(),
    maxParticipants: int("max_participants").default(100),
    isPublic: boolean("is_public").default(true).notNull(),
    createdBy: varchar("created_by", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index("hackathons_status_idx").on(table.status),
  }),
);

export const hackathonParticipants = mysqlTable(
  "hackathon_participants",
  {
    id: serial("id").primaryKey(),
    hackathonId: int("hackathon_id").notNull(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    teamName: varchar("team_name", { length: 100 }),
    status: mysqlEnum("status", ["registered", "active", "disqualified", "winner"])
      .default("registered")
      .notNull(),
    score: int("score").default(0).notNull(),
    rank: int("rank").default(0),
    registeredAt: timestamp("registered_at").defaultNow().notNull(),
  },
  (table) => ({
    hackathonIdx: index("hackathon_participants_hackathon_id_idx").on(table.hackathonId),
    uniqueParticipant: uniqueIndex("hackathon_participant_unique").on(table.hackathonId, table.userId),
  }),
);

// Social Bookmarking & Collections
export const bookmarks = mysqlTable(
  "bookmarks",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    url: varchar("url", { length: 500 }).notNull(),
    description: text("description"),
    collectionId: int("collection_id"),
    tags: text("tags"),
    favicon: varchar("favicon", { length: 500 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("bookmarks_user_id_idx").on(table.userId),
    collectionIdx: index("bookmarks_collection_id_idx").on(table.collectionId),
  }),
);

export const bookmarkCollections = mysqlTable(
  "bookmark_collections",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    color: varchar("color", { length: 20 }).default("#00d4ff"),
    isPublic: boolean("is_public").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("bookmark_collections_user_id_idx").on(table.userId),
  }),
);

// Organization & Team Workspaces
export const organizations = mysqlTable(
  "organizations",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 50 }).notNull(),
    description: text("description"),
    avatar: varchar("avatar", { length: 255 }),
    ownerId: varchar("owner_id", { length: 255 }).notNull(),
    plan: mysqlEnum("plan", ["free", "pro", "enterprise"]).default("free").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    slugIdx: uniqueIndex("organizations_slug_unique").on(table.slug),
  }),
);

export const organizationMembers = mysqlTable(
  "organization_members",
  {
    id: serial("id").primaryKey(),
    organizationId: int("organization_id").notNull(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    role: mysqlEnum("role", ["owner", "admin", "member", "viewer"])
      .default("member")
      .notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("organization_members_org_id_idx").on(table.organizationId),
    uniqueMember: uniqueIndex("organization_member_unique").on(table.organizationId, table.userId),
  }),
);

// Webhooks & External Integrations
export const webhooks = mysqlTable(
  "webhooks",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    url: varchar("url", { length: 500 }).notNull(),
    event: mysqlEnum("event", [
      "project.created", "project.updated", "project.deleted",
      "snippet.created", "snippet.shared",
      "deployment.started", "deployment.completed", "deployment.failed",
      "bug.reported", "comment.created"
    ]).notNull(),
    secret: varchar("secret", { length: 255 }),
    isActive: boolean("is_active").default(true).notNull(),
    lastTriggeredAt: timestamp("last_triggered_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("webhooks_user_id_idx").on(table.userId),
  }),
);

export const integrations = mysqlTable(
  "integrations",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    provider: varchar("provider", { length: 50 }).notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at"),
    metadata: text("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userProviderIdx: uniqueIndex("integrations_user_provider_unique").on(table.userId, table.provider),
  }),
);

// Automated Documentation Generator
export const documentation = mysqlTable(
  "documentation",
  {
    id: serial("id").primaryKey(),
    projectId: int("project_id").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    content: text("content").notNull(),
    language: varchar("language", { length: 50 }).default("markdown").notNull(),
    version: varchar("version", { length: 20 }).default("1.0.0"),
    isAutoGenerated: boolean("is_auto_generated").default(true).notNull(),
    createdBy: varchar("created_by", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("documentation_project_id_idx").on(table.projectId),
  }),
);

// Live Code Streaming
export const codeStreams = mysqlTable(
  "code_streams",
  {
    id: serial("id").primaryKey(),
    streamerId: varchar("streamer_id", { length: 255 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    projectId: int("project_id"),
    status: mysqlEnum("status", ["idle", "live", "paused", "ended"])
      .default("idle")
      .notNull(),
    viewerCount: int("viewer_count").default(0).notNull(),
    startedAt: timestamp("started_at"),
    endedAt: timestamp("ended_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    streamerIdx: index("code_streams_streamer_id_idx").on(table.streamerId),
    statusIdx: index("code_streams_status_idx").on(table.status),
  }),
);

export const streamViewers = mysqlTable(
  "stream_viewers",
  {
    id: serial("id").primaryKey(),
    streamId: int("stream_id").notNull(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => ({
    streamIdx: index("stream_viewers_stream_id_idx").on(table.streamId),
    uniqueViewer: uniqueIndex("stream_viewer_unique").on(table.streamId, table.userId),
  }),
);

// Dependency Visualizer
export const projectDependencies = mysqlTable(
  "project_dependencies",
  {
    id: serial("id").primaryKey(),
    projectId: int("project_id").notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    version: varchar("version", { length: 50 }).notNull(),
    type: mysqlEnum("type", ["production", "development", "peer", "optional"])
      .default("production")
      .notNull(),
    source: varchar("source", { length: 50 }).default("npm"),
    metadata: text("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("project_dependencies_project_id_idx").on(table.projectId),
  }),
);

// Integrated Deployment Pipeline (CI/CD)
export const deployments = mysqlTable(
  "deployments",
  {
    id: serial("id").primaryKey(),
    projectId: int("project_id").notNull(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    environment: mysqlEnum("environment", ["development", "staging", "production"])
      .default("development")
      .notNull(),
    status: mysqlEnum("status", ["pending", "building", "deployed", "failed", "cancelled"])
      .default("pending")
      .notNull(),
    commitSha: varchar("commit_sha", { length: 50 }),
    buildLog: text("build_log"),
    deployedUrl: varchar("deployed_url", { length: 500 }),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("deployments_project_id_idx").on(table.projectId),
    statusIdx: index("deployments_status_idx").on(table.status),
  }),
);

// Smart Bug Reporting & Tagging
export const bugReports = mysqlTable(
  "bug_reports",
  {
    id: serial("id").primaryKey(),
    projectId: int("project_id").notNull(),
    reporterId: varchar("reporter_id", { length: 255 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    severity: mysqlEnum("severity", ["critical", "high", "medium", "low", "trivial"])
      .default("medium")
      .notNull(),
    status: mysqlEnum("status", ["open", "in_progress", "resolved", "closed", "wont_fix"])
      .default("open")
      .notNull(),
    tags: text("tags"),
    stepsToReproduce: text("steps_to_reproduce"),
    expectedBehavior: text("expected_behavior"),
    actualBehavior: text("actual_behavior"),
    assignedTo: varchar("assigned_to", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("bug_reports_project_id_idx").on(table.projectId),
    statusIdx: index("bug_reports_status_idx").on(table.status),
  }),
);

// Collaborative Environment Variables Management
export const environmentVariables = mysqlTable(
  "environment_variables",
  {
    id: serial("id").primaryKey(),
    projectId: int("project_id").notNull(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    key: varchar("key", { length: 100 }).notNull(),
    value: text("value"),
    isSecret: boolean("is_secret").default(false).notNull(),
    environment: mysqlEnum("environment", ["development", "staging", "production"])
      .default("development")
      .notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("environment_variables_project_id_idx").on(table.projectId),
    uniqueKey: uniqueIndex("env_var_unique").on(table.projectId, table.key, table.environment),
  }),
);

// Interactive Code Playgrounds
export const codePlaygrounds = mysqlTable(
  "code_playgrounds",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    language: varchar("language", { length: 50 }).notNull(),
    code: text("code").notNull(),
    config: text("config"),
    isPublic: boolean("is_public").default(false).notNull(),
    likes: int("likes").default(0).notNull(),
    views: int("views").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("code_playgrounds_user_id_idx").on(table.userId),
  }),
);

// Real-time Whiteboarding
export const whiteboards = mysqlTable(
  "whiteboards",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    projectId: int("project_id"),
    title: varchar("title", { length: 255 }).notNull(),
    canvasData: text("canvas_data"),
    isPublic: boolean("is_public").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("whiteboards_user_id_idx").on(table.userId),
    projectIdx: index("whiteboards_project_id_idx").on(table.projectId),
  }),
);
