import type { PluginDefinition } from "../types/plugin";

/**
 * Define a GoatCode micro-plugin.
 *
 * This is the primary authoring API for creating plugins.
 * Both internal GoatCode plugins and external plugins use this function.
 *
 * @example
 * ```typescript
 * import { definePlugin } from "goatcode-sh"
 *
 * export default definePlugin({
 *   name: "my-plugin",
 *   version: "1.0.0",
 *   hooks: {
 *     "tool.execute.before": async (input, output) => {
 *       // called before every tool execution
 *     },
 *   },
 *   tools: {
 *     my_tool: {
 *       description: "Does something useful",
 *       parameters: { type: "object", properties: {} },
 *       execute: async (args) => "result",
 *     },
 *   },
 * })
 * ```
 *
 * @param definition - The plugin definition object
 * @returns The definition unchanged (typed identity function for IDE autocomplete)
 */
export function definePlugin(definition: PluginDefinition): PluginDefinition {
  return definition;
}
