import type { OcHeadConfig } from "../types/config"

/**
 * Define your ochead configuration.
 * Provides TypeScript autocomplete and type checking for your config file.
 *
 * @example
 * // ochead.config.ts
 * import { defineConfig } from "ochead"
 * export default defineConfig({
 *   agents: {
 *     orchestrator: { model: "anthropic/claude-opus-4-6" }
 *   }
 * })
 */
export function defineConfig(config: OcHeadConfig): OcHeadConfig {
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
  config: OcHeadConfig | (() => Promise<OcHeadConfig> | OcHeadConfig)
): OcHeadConfig | (() => Promise<OcHeadConfig> | OcHeadConfig) {
  return config
}
