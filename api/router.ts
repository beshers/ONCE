import { authRouter } from "./auth-router";
import { createRouter, publicQuery } from "./middleware";
import { projectRouter } from "./projectRouter";
import { snippetRouter } from "./snippetRouter";
import { chatRouter } from "./chatRouter";
import { friendRouter } from "./friendRouter";
import { notificationRouter } from "./notificationRouter";
import { socialRouter } from "./socialRouter";
import { gamificationRouter } from "./gamificationRouter";
import { reviewRouter } from "./reviewRouter";
import { activityRouter } from "./activityRouter";
import { terminalRouter } from "./terminalRouter";
import { userRouter } from "./userRouter";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  project: projectRouter,
  snippet: snippetRouter,
  chat: chatRouter,
  friend: friendRouter,
  notification: notificationRouter,
  social: socialRouter,
  gamification: gamificationRouter,
  review: reviewRouter,
  activity: activityRouter,
  terminal: terminalRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
