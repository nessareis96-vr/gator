import fs from "fs";
import os from "os";
import path from "path";

export type Config = {
  dbUrl: string;
  currentUserName?: string;
};

function getConfigFilePath(): string {
  return path.join(os.homedir(), ".gatorconfig.json");
}

function validateConfig(rawConfig: unknown): Config {
  if (
    typeof rawConfig !== "object" ||
    rawConfig === null ||
    Array.isArray(rawConfig)
  ) {
    throw new Error("A configuração deve ser um objeto JSON.");
  }

  if (
    !("db_url" in rawConfig) ||
    typeof rawConfig.db_url !== "string"
  ) {
    throw new Error("A configuração deve conter db_url como string.");
  }

  const cfg: Config = {
    dbUrl: rawConfig.db_url,
  };

  if ("current_user_name" in rawConfig) {
    if (typeof rawConfig.current_user_name !== "string") {
      throw new Error("current_user_name deve ser uma string.");
    }

    cfg.currentUserName = rawConfig.current_user_name;
  }

  return cfg;
}

export function readConfig(): Config {
  const filePath = getConfigFilePath();
  const content = fs.readFileSync(filePath, "utf-8");
  const rawConfig: unknown = JSON.parse(content);

  return validateConfig(rawConfig);
}

function writeConfig(cfg: Config): void {
  const rawConfig = {
    db_url: cfg.dbUrl,
    current_user_name: cfg.currentUserName,
  };

  const content = JSON.stringify(rawConfig, null, 2);

  fs.writeFileSync(getConfigFilePath(), content, "utf-8");
}

export function setUser(userName: string): void {
  const cfg = readConfig();
  cfg.currentUserName = userName;
  writeConfig(cfg);
}