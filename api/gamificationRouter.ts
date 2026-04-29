import { createRouter, authedQuery, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { userStats, badges, userBadges, users } from "@db/schema";
import { eq, desc } from "drizzle-orm";

export const gamificationRouter = createRouter({
  stats: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const [stats] = await db.select().from(userStats).where(eq(userStats.userId, ctx.user.id));
    if (!stats) {
      await db.insert(userStats).values({ userId: ctx.user.id });
      return { userId: ctx.user.id, xp: 0, level: 1, projectsCreated: 0, projectsCollaborated: 0, snippetsShared: 0, codeReviewsDone: 0, messagesSent: 0, totalCodingTime: 0, streakDays: 0, longestStreak: 0 };
    }
    return stats;
  }),

  leaderboard: publicQuery.query(async () => {
    const db = getDb();
    const rows = await db.select({
      stats: userStats,
      user: { id: users.id, name: users.name, username: users.username, avatar: users.avatar },
    }).from(userStats)
      .leftJoin(users, eq(userStats.userId, users.id))
      .orderBy(desc(userStats.xp))
      .limit(50);
    return rows;
  }),

  badges: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db.select({
      userBadge: userBadges,
      badge: badges,
    }).from(userBadges)
      .leftJoin(badges, eq(userBadges.badgeId, badges.id))
      .where(eq(userBadges.userId, ctx.user.id))
      .orderBy(desc(userBadges.earnedAt));
    return rows;
  }),

  allBadges: publicQuery.query(async () => {
    const db = getDb();
    return await db.select().from(badges);
  }),

  // Internal: check and award badges
  checkBadges: authedQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    const [stats] = await db.select().from(userStats).where(eq(userStats.userId, ctx.user.id));
    if (!stats) return [];
    const allBadgesList = await db.select().from(badges);
    const userBadgeIds = (await db.select({ badgeId: userBadges.badgeId }).from(userBadges).where(eq(userBadges.userId, ctx.user.id))).map((b) => b.badgeId);
    const earned = [];
    for (const badge of allBadgesList) {
      if (userBadgeIds.includes(badge.id)) continue;
      let qualifies = false;
      switch (badge.requirementType) {
        case "projects_created":
          if (stats.projectsCreated >= (badge.requirementValue ?? 0)) qualifies = true;
          break;
        case "snippets_shared":
          if (stats.snippetsShared >= (badge.requirementValue ?? 0)) qualifies = true;
          break;
        case "messages_sent":
          if (stats.messagesSent >= (badge.requirementValue ?? 0)) qualifies = true;
          break;
        case "xp":
          if (stats.xp >= (badge.requirementValue ?? 0)) qualifies = true;
          break;
        case "code_reviews":
          if (stats.codeReviewsDone >= (badge.requirementValue ?? 0)) qualifies = true;
          break;
      }
      if (qualifies) {
        await db.insert(userBadges).values({ userId: ctx.user.id, badgeId: badge.id });
        earned.push(badge);
      }
    }
    // Recalculate level
    const newLevel = Math.floor(Math.sqrt(stats.xp / 100)) + 1;
    if (newLevel > stats.level) {
      await db.update(userStats).set({ level: newLevel }).where(eq(userStats.userId, ctx.user.id));
    }
    return earned;
  }),
});
