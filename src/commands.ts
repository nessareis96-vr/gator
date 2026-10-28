import { readConfig, setUser } from "./config.js";

import {
  createUser,
  getUserByName,
  deleteAllUsers,
  getUsers,
} from "./lib/db/queries/users.js";

import {
  createFeed,
  getFeeds,
  getFeedByURL,
} from "./lib/db/queries/feeds.js";

import {
  createFeedFollow,
  getFeedFollowsForUser,
  deleteFeedFollow
} from "./lib/db/queries/feed_follows.js";

import {
  parseDuration,
  scrapeFeeds,
} from "./lib/aggregator.js";

import type { Feed, User } from "./lib/db/schema.js";

import { getPostsForUser } from "./lib/db/queries/posts.js";


export type CommandHandler = (
  cmdName: string,
  ...args: string[]
) => Promise<void>;

export type UserCommandHandler = (
  cmdName: string,
  user: User,
  ...args: string[]
) => Promise<void>;

export type CommandsRegistry = Record<string, CommandHandler>;

async function getCurrentUser(): Promise<User> {
  const config = readConfig();

  if (!config.currentUserName) {
    throw new Error("Faça login antes de executar este comando.");
  }

  const user = await getUserByName(config.currentUserName);

  if (user === undefined) {
    throw new Error(
      "O usuário atual não existe no banco. Cadastre-se ou faça login.",
    );
  }

  return user;
}

export function middlewareLoggedIn(
  handler: UserCommandHandler,
): CommandHandler {
  return async (
    cmdName: string,
    ...args: string[]
  ): Promise<void> => {
    const user = await getCurrentUser();

    await handler(cmdName, user, ...args);
  };
}

export function registerCommand(
  registry: CommandsRegistry,
  cmdName: string,
  handler: CommandHandler,
): void {
  registry[cmdName] = handler;
}

export async function runCommand(
  registry: CommandsRegistry,
  cmdName: string,
  ...args: string[]
): Promise<void> {
  if (!Object.hasOwn(registry, cmdName)) {
    throw new Error(`Comando desconhecido: "${cmdName}".`);
  }

  const handler = registry[cmdName];

  if (handler === undefined) {
    throw new Error(`Handler não encontrado para "${cmdName}".`);
  }

  await handler(cmdName, ...args);
}

export async function handlerLogin(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const userName = args[0];

  if (userName === undefined || userName.trim() === "") {
    throw new Error(`O comando "${cmdName}" exige um nome de usuário.`);
  }

  const user = await getUserByName(userName);

  if (user === undefined) {
    throw new Error(`O usuário "${userName}" não existe.`);
  }

  setUser(userName);
  console.log(`Usuário definido como "${userName}".`);
}

export async function handlerRegister(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const userName = args[0];

  if (userName === undefined || userName.trim() === "") {
    throw new Error(`O comando "${cmdName}" exige um nome de usuário.`);
  }

  const existingUser = await getUserByName(userName);

  if (existingUser !== undefined) {
    throw new Error(`O usuário "${userName}" já existe.`);
  }

  const user = await createUser(userName);

  setUser(userName);

  console.log(`Usuário "${userName}" criado com sucesso.`);
  console.log(user);
}

export async function handlerReset(
  _cmdName: string,
  ..._args: string[]
): Promise<void> {
  await deleteAllUsers();

  console.log("Banco resetado: todos os usuários foram removidos.");
}

export async function handlerUsers(
  _cmdName: string,
  ..._args: string[]
): Promise<void> {
  const allUsers = await getUsers();
  const config = readConfig();

  for (const user of allUsers) {
    if (user.name === config.currentUserName) {
      console.log(`* ${user.name} (current)`);
    } else {
      console.log(`* ${user.name}`);
    }
  }
}

export async function handlerAgg(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const [duration] = args;

  if (args.length !== 1 || duration === undefined) {
    throw new Error(`Uso: ${cmdName} <intervalo>. Exemplo: ${cmdName} 1m`);
  }

  const timeBetweenRequests = parseDuration(duration);

  console.log(`Coletando feeds a cada ${duration}.`);

  let isRunning = false;
  let isStopping = false;

  const handleError = (error: unknown): void => {
    if (error instanceof Error) {
      console.error(`Erro ao coletar feed: ${error.message}`);
    } else {
      console.error("Erro ao coletar feed:", error);
    }
  };

  const runScrape = async (): Promise<void> => {
    if (isRunning || isStopping) {
      return;
    }

    isRunning = true;

    try {
      await scrapeFeeds();
    } finally {
      isRunning = false;
    }
  };

  await new Promise<void>((resolve) => {
    const interval = setInterval(() => {
      runScrape().catch(handleError);
    }, timeBetweenRequests);

    process.once("SIGINT", () => {
      isStopping = true;

      console.log("\nEncerrando o agregador de feeds...");
      clearInterval(interval);

      resolve();
    });

    runScrape().catch(handleError);
  });
}

function printFeed(feed: Feed, user: User): void {
  console.log(`ID: ${feed.id}`);
  console.log(`Name: ${feed.name}`);
  console.log(`URL: ${feed.url}`);
  console.log(`User ID: ${feed.userId}`);
  console.log(`User: ${user.name}`);
  console.log(`Created at: ${feed.createdAt.toISOString()}`);
  console.log(`Updated at: ${feed.updatedAt.toISOString()}`);
}

export async function handlerAddFeed(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  const [name, url] = args;

  if (
    args.length !== 2 ||
    name === undefined ||
    url === undefined ||
    name.trim() === "" ||
    url.trim() === ""
  ) {
    throw new Error(`Uso: ${cmdName} <nome> <url>.`);
  }

  const feed = await createFeed(name, url, user.id);
  const follow = await createFeedFollow(user.id, feed.id);

  console.log("Feed criado com sucesso.");
  printFeed(feed, user);

  console.log(
    `${follow.userName} agora segue "${follow.feedName}".`,
  );
}

export async function handlerFeeds(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  if (args.length !== 0) {
    throw new Error(`O comando "${cmdName}" não recebe argumentos.`);
  }

  const allFeeds = await getFeeds();

  for (const feed of allFeeds) {
    console.log(`Name: ${feed.name}`);
    console.log(`URL: ${feed.url}`);
    console.log(`User: ${feed.userName}`);
    console.log();
  }
}

export async function handlerFollow(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  const [url] = args;

  if (
    args.length !== 1 ||
    url === undefined ||
    url.trim() === ""
  ) {
    throw new Error(`Uso: ${cmdName} <url>.`);
  }

  const feed = await getFeedByURL(url);

  if (feed === undefined) {
    throw new Error("Nenhum feed cadastrado com essa URL.");
  }

  const follow = await createFeedFollow(user.id, feed.id);

  console.log(
    `${follow.userName} agora segue "${follow.feedName}".`,
  );
}

export async function handlerFollowing(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length !== 0) {
    throw new Error(`O comando "${cmdName}" não recebe argumentos.`);
  }

  const follows = await getFeedFollowsForUser(user.id);

  for (const follow of follows) {
    console.log(`* ${follow.feedName}`);
  }
}

export async function handlerUnfollow(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  const [url] = args;

  if (
    args.length !== 1 ||
    url === undefined ||
    url.trim() === ""
  ) {
    throw new Error(`Uso: ${cmdName} <url>.`);
  }

  await deleteFeedFollow(user.id, url);

  console.log(`${user.name} não está mais seguindo "${url}".`);
}

export async function handlerBrowse(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length > 1) {
    throw new Error(`Uso: ${cmdName} [limite].`);
  }

  const limitText = args[0] ?? "2";

  if (!/^\d+$/.test(limitText)) {
    throw new Error("O limite deve ser um número inteiro positivo.");
  }

  const limit = Number(limitText);

  if (
    !Number.isSafeInteger(limit) ||
    limit <= 0 ||
    limit > 2_147_483_647
  ) {
    throw new Error("O limite deve ser um inteiro positivo válido.");
  }

  const userPosts = await getPostsForUser(user.id, limit);

  if (userPosts.length === 0) {
    console.log("Nenhum post disponível nos feeds que você segue.");
    return;
  }

  for (const post of userPosts) {
    const publishedAt = post.publishedAt
      ? post.publishedAt.toISOString()
      : "Data não informada ou não reconhecida";

    console.log(`Título: ${post.title}`);
    console.log(`Publicado em: ${publishedAt}`);
    console.log(`URL: ${post.url}`);
    console.log(`Descrição: ${post.description ?? "Sem descrição."}`);
    console.log();
  }
}