import {
  registerCommand,
  runCommand,
  middlewareLoggedIn,
  handlerLogin,
  handlerRegister,
  handlerReset,
  handlerUsers,
  handlerAgg,
  handlerAddFeed,
  handlerFeeds,
  handlerFollow,
  handlerFollowing,
  handlerUnfollow,
  handlerBrowse,
  type CommandsRegistry,
} from "./commands.js";

async function main(): Promise<void> {
  const registry: CommandsRegistry = {};

  registerCommand(registry, "login", handlerLogin);
  registerCommand(registry, "register", handlerRegister);
  registerCommand(registry, "reset", handlerReset);
  registerCommand(registry, "users", handlerUsers);
  registerCommand(registry, "agg", handlerAgg);
  registerCommand(registry, "feeds", handlerFeeds);

  registerCommand(
    registry,
    "addfeed",
    middlewareLoggedIn(handlerAddFeed),
  );

  registerCommand(
    registry,
    "follow",
    middlewareLoggedIn(handlerFollow),
  );

  registerCommand(
    registry,
    "following",
    middlewareLoggedIn(handlerFollowing),
  );

  registerCommand(
  registry,
  "unfollow",
  middlewareLoggedIn(handlerUnfollow),
  );

  registerCommand(
  registry,
  "browse",
  middlewareLoggedIn(handlerBrowse),
  );

  const args = process.argv.slice(2);
  const [cmdName, ...cmdArgs] = args;

  if (cmdName === undefined) {
    throw new Error("Argumentos insuficientes. Informe um comando.");
  }

  await runCommand(registry, cmdName, ...cmdArgs);
  
  process.exit(0);
}

main().catch((error: unknown) => {
  console.dir(error, { depth: null });
  process.exit(1);
});