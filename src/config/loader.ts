import { existsSync } from "node:fs"
import type { GoatCodeConfig } from "../types/config"
import { deepMerge } from "../shared/deep-merge"
import { log } from "../shared/logger"
import { validateConfig } from "./validator"
import { resolveLegacyProjectConfigPath, resolveProjectConfigPath, resolveUserConfigPath } from "./paths"

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

async function loadValidatedConfigFile(configPath: string): Promise<GoatCodeConfig | null> {
  const raw = await loadConfigFile(configPath)
  if (raw === null) return null

  const validation = validateConfig(raw)
  if (!validation.success) {
    log("[config/loader] Loaded config failed validation", {
      configPath,
      errors: validation.errors,
    })
    return null
  }

  return validation.config
}

export async function loadConfig(projectDir: string): Promise<GoatCodeConfig | null> {
  const userConfigPath = resolveUserConfigPath()
  const userConfig = userConfigPath && existsSync(userConfigPath) ? await loadValidatedConfigFile(userConfigPath) : null

  const projectConfigPath = resolveProjectConfigPath(projectDir)
  const hasProjectConfig = existsSync(projectConfigPath)
  let projectConfig: GoatCodeConfig | null = null

  if (hasProjectConfig) {
    projectConfig = await loadValidatedConfigFile(projectConfigPath)
  }

  if (!hasProjectConfig) {
    const legacyConfigPath = resolveLegacyProjectConfigPath(projectDir)
    if (existsSync(legacyConfigPath)) {
      log("[config/loader] Found legacy ochead.config.ts — please rename it to goatcode.config.ts", {
        legacyPath: legacyConfigPath,
      })
      process.stderr.write(
        `[goatcode] DEPRECATION: ochead.config.ts is deprecated. Please rename it to goatcode.config.ts\n`
      )
      projectConfig = await loadValidatedConfigFile(legacyConfigPath)
    }
  }

  if (userConfig && projectConfig) {
    return deepMerge(userConfig as Record<string, unknown>, projectConfig as Record<string, unknown>) as GoatCodeConfig
  }

  return projectConfig ?? userConfig
}
