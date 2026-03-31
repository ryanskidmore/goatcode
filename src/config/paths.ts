import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const USER_CONFIG_FILE_NAME = "goatcode.ts";
const PROJECT_CONFIG_FILE_NAME = "goatcode.config.ts";
const LEGACY_PROJECT_CONFIG_FILE_NAME = "ochead.config.ts";

export function resolveUserConfigDir(): string {
  return process.env.GOATCODE_CONFIG_DIR && process.env.GOATCODE_CONFIG_DIR.trim() !== ""
    ? process.env.GOATCODE_CONFIG_DIR
    : join(homedir(), ".config", "opencode");
}

export function resolveUserConfigPath(): string | null {
  const userConfigDir = resolveUserConfigDir();
  if (!existsSync(userConfigDir)) {
    return null;
  }

  return join(userConfigDir, USER_CONFIG_FILE_NAME);
}

export function resolveProjectConfigPath(projectDir: string): string {
  return join(projectDir, PROJECT_CONFIG_FILE_NAME);
}

export function resolveLegacyProjectConfigPath(projectDir: string): string {
  return join(projectDir, LEGACY_PROJECT_CONFIG_FILE_NAME);
}
