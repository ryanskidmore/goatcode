import type { GoatCodeConfig } from "../types/config"

/**
 * Define your goatcode configuration.
 * Provides TypeScript autocomplete and type checking for your config file.
 *
 * @example
 * // goatcode.config.ts
 * import { defineConfig } from "goatcode-sh"
 * export default defineConfig({
 *   agents: {
 *     orchestrator: { model: "anthropic/claude-opus-4-6" }
 *   }
 * })
 */
export function defineConfig(config: GoatCodeConfig): GoatCodeConfig {
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
  config: GoatCodeConfig | (() => Promise<GoatCodeConfig> | GoatCodeConfig)
): GoatCodeConfig | (() => Promise<GoatCodeConfig> | GoatCodeConfig) {
  return config
}
