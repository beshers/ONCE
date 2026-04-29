import { z } from "zod";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { incrementUserStats } from "./queries/user-stats";
import { projects, projectFiles, projectCollaborators, projectVersions, users } from "@db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

export const projectRouter = createRouter({
  // ── LIST ──
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const owned = await db.select().from(projects).where(eq(projects.ownerId, ctx.user.id)).orderBy(desc(projects.updatedAt));
    const collabs = await db.select({ projectId: projectCollaborators.projectId }).from(projectCollaborators).where(eq(projectCollaborators.userId, ctx.user.id));
    const projectIds = collabs.map((c) => c.projectId);
    const collabProjects = projectIds.length
      ? await db.select().from(projects).where(inArray(projects.id, projectIds))
      : [];
    return { owned, collaborated: collabProjects };
  }),

  // ── GET ONE ──
  get: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const [project] = await db.select().from(projects).where(eq(projects.id, input.id));
      if (!project) throw new Error("Project not found");
      const isOwner = project.ownerId === ctx.user.id;
      if (!project.isPublic && !isOwner) {
        const [collab] = await db.select().from(projectCollaborators).where(
          and(eq(projectCollaborators.projectId, input.id), eq(projectCollaborators.userId, ctx.user.id))
        );
        if (!collab) throw new Error("Access denied");
      }
      await db.update(projects).set({ views: sql`${projects.views} + 1` }).where(eq(projects.id, input.id));
      return project;
    }),

  // ── CREATE ──
  create: authedQuery
    .input(z.object({
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      language: z.string().default("plaintext"),
      isPublic: z.boolean().default(true),
      tags: z.string().optional(),
      initialCode: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [{ id }] = await db.insert(projects).values({
        ownerId: ctx.user.id,
        name: input.name,
        description: input.description,
        language: input.language,
        isPublic: input.isPublic,
        tags: input.tags,
      }).$returningId();
      await db.insert(projectFiles).values({
        projectId: id,
        name: "main",
        type: "file",
        content: input.initialCode || "",
        language: input.language,
      });
      await incrementUserStats(ctx.user.id, { projectsCreated: 1, xp: 50 });
      return { id, name: input.name };
    }),

  // ── UPDATE ──
  update: authedQuery
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      language: z.string().optional(),
      isPublic: z.boolean().optional(),
      tags: z.string().optional(),
      status: z.enum(["active", "archived", "draft"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;
      const [project] = await db.select().from(projects).where(eq(projects.id, id));
      if (!project || project.ownerId !== ctx.user.id) throw new Error("Access denied");
      await db.update(projects).set(data).where(eq(projects.id, id));
      return { success: true };
    }),

  // ── DELETE ──
  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [project] = await db.select().from(projects).where(eq(projects.id, input.id));
      if (!project || project.ownerId !== ctx.user.id) throw new Error("Access denied");
      await db.delete(projects).where(eq(projects.id, input.id));
      return { success: true };
    }),

  // ── FILES ──
  fileList: authedQuery
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const [project] = await db.select().from(projects).where(eq(projects.id, input.projectId));
      if (!project) throw new Error("Project not found");
      if (!project.isPublic && project.ownerId !== ctx.user.id) {
        const [collab] = await db.select().from(projectCollaborators).where(
          and(eq(projectCollaborators.projectId, input.projectId), eq(projectCollaborators.userId, ctx.user.id))
        );
        if (!collab) throw new Error("Access denied");
      }
      const files = await db.select().from(projectFiles).where(eq(projectFiles.projectId, input.projectId));
      return files;
    }),

  fileCreate: authedQuery
    .input(z.object({
      projectId: z.number(),
      parentId: z.number().optional(),
      name: z.string().min(1),
      type: z.enum(["file", "folder"]).default("file"),
      content: z.string().optional(),
      language: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [project] = await db.select().from(projects).where(eq(projects.id, input.projectId));
      if (!project) throw new Error("Project not found");
      const canEdit = project.ownerId === ctx.user.id || !!(await db.query.projectCollaborators.findFirst({
        where: and(
          eq(projectCollaborators.projectId, input.projectId),
          eq(projectCollaborators.userId, ctx.user.id),
          eq(projectCollaborators.role, "editor")
        ),
      }));
      if (!canEdit) throw new Error("Edit access denied");
      const [{ id }] = await db.insert(projectFiles).values(input).$returningId();
      return { id };
    }),

  fileUpdate: authedQuery
    .input(z.object({
      id: z.number(),
      content: z.string(),
      name: z.string().optional(),
      language: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [file] = await db.select().from(projectFiles).where(eq(projectFiles.id, input.id));
      if (!file) throw new Error("File not found");
      const [project] = await db.select().from(projects).where(eq(projects.id, file.projectId));
      const canEdit = project.ownerId === ctx.user.id || !!(await db.query.projectCollaborators.findFirst({
        where: and(
          eq(projectCollaborators.projectId, file.projectId),
          eq(projectCollaborators.userId, ctx.user.id),
          eq(projectCollaborators.role, "editor")
        ),
      }));
      if (!canEdit) throw new Error("Edit access denied");
      await db.insert(projectVersions).values({
        projectId: file.projectId,
        fileId: file.id,
        userId: ctx.user.id,
        content: input.content,
        versionNumber: sql`(SELECT COALESCE(MAX(versionNumber), 0) + 1 FROM project_versions WHERE fileId = ${file.id})`,
      });
      await db.update(projectFiles).set({
        content: input.content,
        ...(input.name ? { name: input.name } : {}),
        ...(input.language ? { language: input.language } : {}),
        updatedAt: new Date(),
      }).where(eq(projectFiles.id, input.id));
      return { success: true };
    }),

  fileDelete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [file] = await db.select().from(projectFiles).where(eq(projectFiles.id, input.id));
      if (!file) throw new Error("File not found");
      const [project] = await db.select().from(projects).where(eq(projects.id, file.projectId));
      if (project.ownerId !== ctx.user.id) throw new Error("Access denied");
      await db.delete(projectFiles).where(eq(projectFiles.id, input.id));
      return { success: true };
    }),

  // ── COLLABORATORS ──
  collaborators: authedQuery
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db.select({
        collab: projectCollaborators,
        user: { id: users.id, name: users.name, username: users.username, avatar: users.avatar },
      }).from(projectCollaborators)
        .leftJoin(users, eq(projectCollaborators.userId, users.id))
        .where(eq(projectCollaborators.projectId, input.projectId));
      return rows;
    }),

  addCollaborator: authedQuery
    .input(z.object({
      projectId: z.number(),
      userId: z.string(),
      role: z.enum(["editor", "viewer"]).default("viewer"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [project] = await db.select().from(projects).where(eq(projects.id, input.projectId));
      if (!project || project.ownerId !== ctx.user.id) throw new Error("Access denied");
      await db.insert(projectCollaborators).values({
        projectId: input.projectId,
        userId: input.userId,
        role: input.role,
      }).onDuplicateKeyUpdate({
        set: { role: input.role },
      });
      return { success: true };
    }),

  removeCollaborator: authedQuery
    .input(z.object({ projectId: z.number(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [project] = await db.select().from(projects).where(eq(projects.id, input.projectId));
      if (!project || project.ownerId !== ctx.user.id) throw new Error("Access denied");
      await db.delete(projectCollaborators).where(
        and(eq(projectCollaborators.projectId, input.projectId), eq(projectCollaborators.userId, input.userId))
      );
      return { success: true };
    }),

  // ── VERSIONS ──
  versions: authedQuery
    .input(z.object({ fileId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const [file] = await db.select().from(projectFiles).where(eq(projectFiles.id, input.fileId));
      if (!file) throw new Error("File not found");
      const [project] = await db.select().from(projects).where(eq(projects.id, file.projectId));
      const hasAccess = project.isPublic || project.ownerId === ctx.user.id || !!(await db.query.projectCollaborators.findFirst({
        where: and(eq(projectCollaborators.projectId, file.projectId), eq(projectCollaborators.userId, ctx.user.id)),
      }));
      if (!hasAccess) throw new Error("Access denied");
      const versions = await db.select().from(projectVersions)
        .where(eq(projectVersions.fileId, input.fileId))
        .orderBy(desc(projectVersions.createdAt));
      return versions;
    }),

  restoreVersion: authedQuery
    .input(z.object({ versionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [version] = await db.select().from(projectVersions).where(eq(projectVersions.id, input.versionId));
      if (!version) throw new Error("Version not found");
      const [project] = await db.select().from(projects).where(eq(projects.id, version.projectId));
      const canEdit = project.ownerId === ctx.user.id || !!(await db.query.projectCollaborators.findFirst({
        where: and(
          eq(projectCollaborators.projectId, version.projectId),
          eq(projectCollaborators.userId, ctx.user.id),
          eq(projectCollaborators.role, "editor")
        ),
      }));
      if (!canEdit) throw new Error("Edit access denied");
      await db.update(projectFiles).set({ content: version.content, updatedAt: new Date() }).where(eq(projectFiles.id, version.fileId));
      return { success: true };
    }),

  // ── STAR ──
  star: authedQuery
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(projects).set({ stars: sql`${projects.stars} + 1` }).where(eq(projects.id, input.projectId));
      return { success: true };
    }),

  publicProjects: publicQuery.query(async () => {
    const db = getDb();
    const rows = await db.select({
      project: projects,
      owner: { id: users.id, name: users.name, username: users.username, avatar: users.avatar },
    }).from(projects)
      .leftJoin(users, eq(projects.ownerId, users.id))
      .where(eq(projects.isPublic, true))
      .orderBy(desc(projects.updatedAt))
      .limit(50);
    return rows;
  }),
});
