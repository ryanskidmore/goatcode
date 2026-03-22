import { existsSync } from "node:fs"
import { join } from "node:path"
import type { OcHeadConfig } from "../types/config"
import { log } from "../shared/logger"

export async function loadConfigFile(configPath: string): Promise<OcHeadConfig | null> {
  try {
    const module = await import(configPath)
    const raw = module.default ?? module
    if (typeof raw === "function") {
      return await raw()
    }

    return raw as OcHeadConfig
  } catch (error) {
    log("[config/loader] Failed to load config file", { configPath, error })
    return null
  }
}

export async function loadConfig(projectDir: string): Promise<OcHeadConfig | null> {
  const configPath = join(projectDir, "ochead.config.ts")
  if (!existsSync(configPath)) {
    return null
  }

  return loadConfigFile(configPath)
}
