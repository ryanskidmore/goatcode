import { existsSync } from "node:fs"
import { join } from "node:path"
import type { GoatCodeConfig } from "../types/config"
import { log } from "../shared/logger"

export async function loadConfigFile(configPath: string): Promise<GoatCodeConfig | null> {
  try {
    const module = await import(configPath)
    const raw = module.default ?? module
    if (typeof raw === "function") {
      return await raw()
    }

    return raw as GoatCodeConfig
  } catch (error) {
    log("[config/loader] Failed to load config file", { configPath, error })
    return null
  }
}

export async function loadConfig(projectDir: string): Promise<GoatCodeConfig | null> {
  const configPath = join(projectDir, "goatcode.config.ts")
  if (existsSync(configPath)) {
    return loadConfigFile(configPath)
  }

  const legacyConfigPath = join(projectDir, "ochead.config.ts")
  if (existsSync(legacyConfigPath)) {
    log("[config/loader] Found legacy ochead.config.ts — please rename it to goatcode.config.ts", {
      legacyPath: legacyConfigPath,
    })
    process.stderr.write(
      `[goatcode] DEPRECATION: ochead.config.ts is deprecated. Please rename it to goatcode.config.ts\n`
    )
    return loadConfigFile(legacyConfigPath)
  }

  return null
}
