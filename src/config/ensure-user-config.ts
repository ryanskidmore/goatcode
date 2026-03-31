import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { log } from "../shared/logger";
import { generateUserConfig } from "../cli/config-generator";
import { resolveUserConfigDir } from "./paths";

const USER_CONFIG_FILE_NAME = "goatcode.ts";

/**
 * Write the default user-level config to `~/.config/opencode/goatcode.ts`
 * if it doesn't already exist.
 *
 * This is best-effort: errors are logged but never thrown so bootstrap
 * is never blocked by a config-scaffolding failure.
 */
export async function ensureUserConfig(): Promise<void> {
  try {
    const configDir = resolveUserConfigDir();
    const configPath = join(configDir, USER_CONFIG_FILE_NAME);

    if (existsSync(configPath)) {
      return;
    }

    if (!existsSync(configDir)) {
      await mkdir(configDir, { recursive: true });
    }

    const content = generateUserConfig();
    // Use 'wx' flag to avoid overwriting if a concurrent process creates it first.
    await writeFile(configPath, content, { encoding: "utf8", flag: "wx" });
    log("[config] Created default user config", { configPath });
  } catch (error) {
    // EEXIST is expected if another process wrote the file concurrently.
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return;

    const msg = error instanceof Error ? error.message : String(error);
    log("[config] Failed to create default user config (non-fatal)", { error: msg });
  }
}
