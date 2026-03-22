import type { Hooks } from "@opencode-ai/plugin"
import { loadConfig } from "./config/loader"
import { validateConfig } from "./config/validator"
import { PluginRegistry } from "./registry/plugin-registry"
import { buildHooks } from "./hooks/dispatcher"
import { log } from "./shared/logger"
import type { OpenCodeContext } from "./types/plugin"
import type { OcHeadConfig } from "./types/config"

export async function bootstrap(ctx: OpenCodeContext): Promise<Hooks> {
  const rawConfig = await loadConfig(ctx.directory)

  const validation = validateConfig(rawConfig ?? {})
  let config: OcHeadConfig
  if (validation.success) {
    config = validation.config
  } else {
    log("[bootstrap] Config validation failed, using defaults", {
      errors: validation.errors,
    })
    const fallback = validateConfig({})
    if (!fallback.success) {
      throw new Error("[bootstrap] Default config validation failed")
    }
    config = fallback.config
  }

  const registry = new PluginRegistry()

  // TODO: register built-in plugins

  for (const packageName of config.plugins ?? []) {
    try {
      const mod = await import(packageName)
      const pluginDef = mod.default ?? mod
      registry.register(pluginDef)
    } catch (error) {
      log(`[bootstrap] Failed to load external plugin: ${packageName}`, { error })
    }
  }

  const resolved = registry.resolve()
  await registry.setup(resolved, ctx)

  const aggregated = registry.aggregate(resolved)
  return buildHooks(aggregated.hooks, aggregated.tools)
}
