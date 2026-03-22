import type { Plugin } from "@opencode-ai/plugin"

import type { PluginAgentContribution } from "./agent"
import type { PluginHookContributions } from "./hook"
import type { PluginToolContribution } from "./tool"

/** The raw context passed to the plugin by OpenCode. */
export type OpenCodeContext = Parameters<Plugin>[0]

/** The raw plugin instance returned to OpenCode. */
export type OpenCodePluginInstance = Awaited<ReturnType<Plugin>>

/** Generic plugin hook handler fallback type. */
export type PluginHookHandler = (...args: unknown[]) => Promise<void> | void

/**
 * An OpenHead micro-plugin definition.
 * This is the contract used by internal and external plugins.
 */
export interface PluginDefinition {
  /** Unique plugin name (kebab-case). */
  readonly name: string
  /** Semantic version string. */
  readonly version?: string
  /** Plugin names this depends on (must be registered first). */
  readonly dependencies?: readonly string[]
  /** Hook contributions keyed by OpenCode hook event name. */
  readonly hooks?: Partial<PluginHookContributions>
  /** Tool contributions keyed by tool name. */
  readonly tools?: Record<string, PluginToolContribution>
  /** Agent contributions keyed by agent name. */
  readonly agents?: Record<string, PluginAgentContribution>
  /** Optional setup executed during registry initialization. */
  readonly setup?: (ctx: OpenCodeContext) => Promise<void> | void
  /** Optional teardown executed when plugin registry is disposed. */
  readonly teardown?: () => Promise<void> | void
}

/** Intermediate aggregated plugin output produced by the registry. */
export interface AggregatedPlugins {
  /** All hook contributions keyed by hook name in execution order. */
  hooks: Map<string, PluginHookHandler[]>
  /** All tool contributions merged into one record. */
  tools: Record<string, PluginToolContribution>
  /** All agent contributions merged into one record. */
  agents: Record<string, PluginAgentContribution>
}
