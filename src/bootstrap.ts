import type { Hooks } from "@opencode-ai/plugin"
import { loadConfig } from "./config/loader"
import { validateConfig } from "./config/validator"
import { PluginRegistry } from "./registry/plugin-registry"
import { compose } from "./plugin/compositor"
import { log } from "./shared/logger"
import type { OpenCodeContext } from "./types/plugin"
import type { GoatCodeConfig } from "./types/config"
import { BUILTIN_AGENT_PLUGINS } from "./agents/builtin-agents"
import { BUILTIN_HOOK_PLUGINS } from "./hooks/builtin-hooks"
import { BUILTIN_TOOL_PLUGINS } from "./tools/builtin-tools"
import { BUILTIN_FEATURE_PLUGINS } from "./features/builtin-features"

export async function bootstrap(ctx: OpenCodeContext): Promise<Hooks> {
  const rawConfig = await loadConfig(ctx.directory)

  const validation = validateConfig(rawConfig ?? {})
  let config: GoatCodeConfig
  if (validation.success) {
    config = validation.config
  } else {
    log("[bootstrap] Config validation failed, using defaults", {
      errors: validation.errors,
    })
    process.stderr.write(
      `[goatcode] WARNING: goatcode.config.ts has validation errors — using defaults.\n` +
      validation.errors.map((e) => `  - ${e}`).join("\n") + "\n"
    )
    const fallback = validateConfig({})
    if (!fallback.success) {
      throw new Error("[bootstrap] Default config validation failed")
    }
    config = fallback.config
  }

  const registry = new PluginRegistry()

  for (const plugin of BUILTIN_AGENT_PLUGINS) {
    registry.register(plugin)
  }

  for (const plugin of BUILTIN_HOOK_PLUGINS) {
    registry.register(plugin)
  }

  for (const plugin of BUILTIN_TOOL_PLUGINS) {
    registry.register(plugin)
  }

  for (const plugin of BUILTIN_FEATURE_PLUGINS) {
    registry.register(plugin)
  }

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

  const aggregated = registry.aggregate(resolved, {
    disabledAgents: config.disabled_agents,
    disabledHooks: config.disabled_hooks,
    disabledTools: config.disabled_tools,
  })
  return compose(aggregated)
}
