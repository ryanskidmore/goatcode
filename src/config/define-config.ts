import type { OpenHeadConfig } from "../types/config"

/**
 * Define your openhead configuration.
 * Provides TypeScript autocomplete and type checking for your config file.
 *
 * @example
 * // openhead.config.ts
 * import { defineConfig } from "openhead"
 * export default defineConfig({
 *   agents: {
 *     orchestrator: { model: "anthropic/claude-opus-4-6" }
 *   }
 * })
 */
export function defineConfig(config: OpenHeadConfig): OpenHeadConfig {
  return config
}

/**
 * Async variant of defineConfig supporting environment-based config.
 *
 * @example
 * export default defineConfigAsync(async () => ({
 *   agents: {
 *     orchestrator: { model: process.env.ORCHESTRATOR_MODEL ?? "anthropic/claude-opus-4-6" }
 *   }
 * }))
 */
export function defineConfigAsync(
  config: OpenHeadConfig | (() => Promise<OpenHeadConfig> | OpenHeadConfig)
): OpenHeadConfig | (() => Promise<OpenHeadConfig> | OpenHeadConfig) {
  return config
}
