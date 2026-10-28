import { db } from "../index.js";
import { feedFollows, feeds, users } from "../schema.js";

import { and, eq, inArray } from "drizzle-orm";

const followFields = {
  id: feedFollows.id,
  createdAt: feedFollows.createdAt,
  updatedAt: feedFollows.updatedAt,
  userId: feedFollows.userId,
  feedId: feedFollows.feedId,
  userName: users.name,
  feedName: feeds.name,
};

export async function createFeedFollow(
  userId: string,
  feedId: string,
) {
  return await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(feedFollows)
      .values({
        userId,
        feedId,
      })
      .returning();

    if (created === undefined) {
      throw new Error("Não foi possível criar a associação.");
    }

    const [result] = await tx
      .select(followFields)
      .from(feedFollows)
      .innerJoin(users, eq(feedFollows.userId, users.id))
      .innerJoin(feeds, eq(feedFollows.feedId, feeds.id))
      .where(eq(feedFollows.id, created.id));

    if (result === undefined) {
      throw new Error("Não foi possível consultar a associação criada.");
    }

    return result;
  });
}

export async function getFeedFollowsForUser(userId: string) {
  return await db
    .select(followFields)
    .from(feedFollows)
    .innerJoin(users, eq(feedFollows.userId, users.id))
    .innerJoin(feeds, eq(feedFollows.feedId, feeds.id))
    .where(eq(feedFollows.userId, userId));
}

export async function deleteFeedFollow(
  userId: string,
  feedURL: string,
): Promise<void> {
  const matchingFeed = db
    .select({ id: feeds.id })
    .from(feeds)
    .where(eq(feeds.url, feedURL));

  await db
    .delete(feedFollows)
    .where(
      and(
        eq(feedFollows.userId, userId),
        inArray(feedFollows.feedId, matchingFeed),
      ),
    );
}