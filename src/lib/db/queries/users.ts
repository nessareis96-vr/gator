import { eq } from "drizzle-orm";

import { db } from "../index.js";
import { users } from "../schema.js";

export async function createUser(name: string) {
  const [result] = await db
    .insert(users)
    .values({ name })
    .returning();

  if (result === undefined) {
    throw new Error("Não foi possível obter o usuário criado.");
  }

  return result;
}

export async function getUserByName(name: string) {
  const [result] = await db
    .select()
    .from(users)
    .where(eq(users.name, name))
    .limit(1);

  return result;
}

export async function deleteAllUsers(): Promise<void> {
  await db.delete(users);
}

export async function getUsers() {
  return await db.select().from(users);
}