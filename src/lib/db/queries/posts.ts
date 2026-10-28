import { desc, eq, sql } from "drizzle-orm";

import { db } from "../index.js";
import {
  posts,
  feedFollows,
  type NewPost,
} from "../schema.js";

export async function createPost(post: NewPost) {
  const [created] = await db
    .insert(posts)
    .values(post)
    .onConflictDoNothing({ target: posts.url })
    .returning();

  return created;
}

export async function getPostsForUser(
  userId: string,
  limit: number = 2,
) {
  if (
    !Number.isSafeInteger(limit) ||
    limit <= 0 ||
    limit > 2_147_483_647
  ) {
    throw new Error("O limite deve ser um inteiro positivo válido.");
  }

  const rows = await db
    .select({
      post: posts,
    })
    .from(posts)
    .innerJoin(
      feedFollows,
      eq(posts.feedId, feedFollows.feedId),
    )
    .where(eq(feedFollows.userId, userId))
    .orderBy(
      sql`${posts.publishedAt} DESC NULLS LAST`,
      desc(posts.createdAt),
      desc(posts.id),
    )
    .limit(limit);

  return rows.map((row) => row.post);
}