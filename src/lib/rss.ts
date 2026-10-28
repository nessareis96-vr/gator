import { XMLParser } from "fast-xml-parser";

export type RSSItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
};

export type RSSFeed = {
  channel: {
    title: string;
    link: string;
    description: string;
    item: RSSItem[];
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export async function fetchFeed(feedURL: string): Promise<RSSFeed> {
  const response = await fetch(feedURL, {
    headers: {
      "User-Agent": "gator",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Erro ao buscar o feed: HTTP ${response.status}.`,
    );
  }

  const xml = await response.text();

  const parser = new XMLParser({
    processEntities: false,
    parseTagValue: false,
  });

  const parsed: unknown = parser.parse(xml);

  if (!isRecord(parsed) || !isRecord(parsed.rss)) {
    throw new Error("Feed inválido: elemento rss ausente ou inválido.");
  }

  const channel = parsed.rss.channel;

  if (!isRecord(channel)) {
    throw new Error("Feed inválido: channel ausente ou inválido.");
  }

  const { title, link, description } = channel;

  if (
    typeof title !== "string" ||
    typeof link !== "string" ||
    typeof description !== "string"
  ) {
    throw new Error(
      "Feed inválido: title, link e description devem ser strings.",
    );
  }

  let rawItems: unknown[] = [];

  if (channel.item !== undefined) {
    if (Array.isArray(channel.item)) {
      rawItems = channel.item;
    } else if (isRecord(channel.item)) {
      rawItems = [channel.item];
    } else {
      throw new Error("Feed inválido: item deve ser um objeto ou array.");
    }
  }

  const items: RSSItem[] = [];

  for (const rawItem of rawItems) {
    if (!isRecord(rawItem)) {
      continue;
    }

    const { title, link, description, pubDate } = rawItem;

    if (
      typeof title !== "string" ||
      title.trim() === "" ||
      typeof link !== "string" ||
      link.trim() === ""
    ) {
      continue;
    }

    items.push({
      title,
      link,
      description:
        typeof description === "string" ? description : "",
      pubDate:
        typeof pubDate === "string" ? pubDate : "",
    });
  }

  return {
    channel: {
      title,
      link,
      description,
      item: items,
    },
  };
}