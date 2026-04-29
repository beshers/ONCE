import { sql } from "drizzle-orm";
import { userStats } from "@db/schema";
import { getDb } from "./connection";

type StatIncrement = {
  xp?: number;
  projectsCreated?: number;
  snippetsShared?: number;
  codeReviewsDone?: number;
  messagesSent?: number;
};

export async function incrementUserStats(userId: string, increments: StatIncrement) {
  const now = new Date();

  await getDb()
    .insert(userStats)
    .values({
      userId,
      xp: increments.xp ?? 0,
      projectsCreated: increments.projectsCreated ?? 0,
      snippetsShared: increments.snippetsShared ?? 0,
      codeReviewsDone: increments.codeReviewsDone ?? 0,
      messagesSent: increments.messagesSent ?? 0,
      lastActiveDate: now,
      updatedAt: now,
    })
    .onDuplicateKeyUpdate({
      set: {
        xp: increments.xp ? sql`${userStats.xp} + ${increments.xp}` : sql`${userStats.xp}`,
        projectsCreated: increments.projectsCreated
          ? sql`${userStats.projectsCreated} + ${increments.projectsCreated}`
          : sql`${userStats.projectsCreated}`,
        snippetsShared: increments.snippetsShared
          ? sql`${userStats.snippetsShared} + ${increments.snippetsShared}`
          : sql`${userStats.snippetsShared}`,
        codeReviewsDone: increments.codeReviewsDone
          ? sql`${userStats.codeReviewsDone} + ${increments.codeReviewsDone}`
          : sql`${userStats.codeReviewsDone}`,
        messagesSent: increments.messagesSent
          ? sql`${userStats.messagesSent} + ${increments.messagesSent}`
          : sql`${userStats.messagesSent}`,
        lastActiveDate: now,
        updatedAt: now,
      },
    });
}
