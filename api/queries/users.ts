import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import * as schema from "@db/schema";
import type { InsertUser } from "@db/schema";
import { getDb } from "./connection";

function buildDisplayName(firstName?: string | null, lastName?: string | null) {
  const parts = [firstName?.trim(), lastName?.trim()].filter(Boolean);
  return parts.join(" ").trim();
}

function slugifyUsername(input: string) {
  const cleaned = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || `user_${Date.now()}`;
}

async function ensureUniqueUsername(base: string) {
  const db = getDb();
  let candidate = base;
  let counter = 1;

  while (true) {
    const rows = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.username, candidate))
      .limit(1);

    if (!rows.length) {
      return candidate;
    }

    counter += 1;
    candidate = `${base}_${counter}`;
  }
}

export async function findUserByEmail(email: string) {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  return rows.at(0);
}

export async function findUserById(id: string) {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);
  return rows.at(0);
}

export async function createUser(data: {
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
}) {
  const emailLocalPart = data.email.split("@")[0] || "user";
  const username = await ensureUniqueUsername(slugifyUsername(emailLocalPart));
  const displayName =
    buildDisplayName(data.firstName, data.lastName) || username;

  const now = new Date();
  await getDb()
    .insert(schema.users)
    .values({
      id: randomUUID(),
      username,
      email: data.email,
      passwordHash: data.passwordHash,
      name: displayName,
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      role: "user",
      status: "online",
      isOnline: true,
      createdAt: now,
      updatedAt: now,
      lastSeenAt: now,
      lastSignInAt: now,
    });

  const createdUser = await findUserByEmail(data.email);
  if (!createdUser) {
    throw new Error("User creation succeeded but the new account could not be reloaded.");
  }

  const userId = String(createdUser.id);

  await getDb()
    .insert(schema.userStats)
    .values({
      userId,
      lastActiveDate: new Date(),
      updatedAt: new Date(),
    })
    .onDuplicateKeyUpdate({
      set: {
        lastActiveDate: new Date(),
        updatedAt: new Date(),
      },
    });

  return createdUser;
}

export async function updateUserLogin(id: string) {
  await getDb()
    .update(schema.users)
    .set({
      lastSignInAt: new Date(),
      lastSeenAt: new Date(),
      updatedAt: new Date(),
      isOnline: true,
      status: "online",
    })
    .where(eq(schema.users.id, id));

  await getDb()
    .insert(schema.userStats)
    .values({
      userId: id,
      lastActiveDate: new Date(),
      updatedAt: new Date(),
    })
    .onDuplicateKeyUpdate({
      set: {
        lastActiveDate: new Date(),
        updatedAt: new Date(),
      },
    });
}

export async function findUserByUnionId(unionId: string) {
  return findUserByEmail(unionId);
}

export async function upsertUser(data: InsertUser) {
  const values = { ...data };
  const updateSet: Partial<InsertUser> = {
    ...data,
    updatedAt: new Date(),
  };

  await getDb()
    .insert(schema.users)
    .values(values)
    .onDuplicateKeyUpdate({ set: updateSet });
}
