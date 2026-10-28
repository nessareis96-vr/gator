import { asc, eq, sql } from "drizzle-orm";

import { db } from "../index.js";
import { feeds, users, type Feed } from "../schema.js";

export async function createFeed(
  name: string,
  url: string,
  userId: string,
): Promise<Feed> {
  const [feed] = await db
    .insert(feeds)
    .values({
      name,
      url,
      userId,
    })
    .returning();

  if (feed === undefined) {
    throw new Error("Não foi possível obter o feed criado.");
  }

  return feed;
}

export async function getFeeds() {
  return await db
    .select({
      name: feeds.name,
      url: feeds.url,
      userName: users.name,
    })
    .from(feeds)
    .innerJoin(users, eq(feeds.userId, users.id));
}

export async function getFeedByURL(url: string) {
  const [feed] = await db
    .select()
    .from(feeds)
    .where(eq(feeds.url, url))
    .limit(1);

  return feed;
}

export async function markFeedFetched(feedId: string): Promise<void> {
  const now = new Date();

  await db
    .update(feeds)
    .set({
      lastFetchedAt: now,
      updatedAt: now,
    })
    .where(eq(feeds.id, feedId));
}

export async function getNextFeedToFetch() {
  const [feed] = await db
    .select()
    .from(feeds)
    .orderBy(
      sql`${feeds.lastFetchedAt} ASC NULLS FIRST`,
      asc(feeds.createdAt),
      asc(feeds.id),
    )
    .limit(1);

  return feed;
}