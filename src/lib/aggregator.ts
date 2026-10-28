import {
  getNextFeedToFetch,
  markFeedFetched,
} from "./db/queries/feeds.js";

import { fetchFeed } from "./rss.js";

import { createPost } from "./db/queries/posts.js";

export function parseDuration(durationStr: string): number {
  const regex = /^(\d+)(ms|s|m|h)$/;
  const match = durationStr.match(regex);

  if (match === null) {
    throw new Error(
      "Duração inválida. Use um inteiro seguido de ms, s, m ou h.",
    );
  }

  const amountText = match[1];
  const unit = match[2];

  if (amountText === undefined || unit === undefined) {
    throw new Error("Não foi possível interpretar a duração.");
  }

  const amount = Number(amountText);

  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
  };

  const multiplier = multipliers[unit];

  if (multiplier === undefined) {
    throw new Error("Unidade de duração inválida.");
  }

  const milliseconds = amount * multiplier;

  if (
    !Number.isSafeInteger(milliseconds) ||
    milliseconds <= 0 ||
    milliseconds > 2_147_483_647
  ) {
    throw new Error(
      "A duração deve estar entre 1 e 2147483647 milissegundos.",
    );
  }

  return milliseconds;
}

function parsePublishedAt(value: string): Date | null {
  const text = value.trim();

  if (text === "") {
    return null;
  }

  const milliseconds = Date.parse(text);

  if (Number.isNaN(milliseconds)) {
    return null;
  }

  return new Date(milliseconds);
}

export async function scrapeFeeds(): Promise<void> {
  const feed = await getNextFeedToFetch();

  if (feed === undefined) {
    console.log("Nenhum feed cadastrado. Aguardando o próximo ciclo.");
    return;
  }

  console.log(
    `[${new Date().toISOString()}] Buscando "${feed.name}": ${feed.url}`,
  );

  const rssFeed = await fetchFeed(feed.url);

  let createdCount = 0;
  let duplicateCount = 0;

  for (const item of rssFeed.channel.item) {
    const publishedAt = parsePublishedAt(item.pubDate);

    if (publishedAt === null && item.pubDate.trim() !== "") {
      console.warn(
        `Data não reconhecida em "${item.title}": ${item.pubDate}`,
      );
    }

    const post = await createPost({
      title: item.title.trim(),
      url: item.link.trim(),
      description: item.description.trim() || null,
      publishedAt,
      feedId: feed.id,
    });

    if (post === undefined) {
      duplicateCount += 1;
    } else {
      createdCount += 1;
    }
  }

  await markFeedFetched(feed.id);

  console.log(
    `Feed "${feed.name}": ${createdCount} posts novos e ` +
      `${duplicateCount} URLs já cadastradas.`,
  );
}

