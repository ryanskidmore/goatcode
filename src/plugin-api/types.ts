export type {
  PluginDefinition,
  AggregatedPlugins,
  OpenCodeContext,
  OpenCodePluginInstance,
  PluginHookHandler,
} from "../types/plugin"

export type { PluginHookContributions } from "../types/hook"

export type {
  AgentConfig,
  AgentMode,
  AgentFactory,
  BuiltinAgentName,
  AgentOverrideConfig,
} from "../types/agent"

export type { ToolDefinition, ToolsRecord } from "../types/tool"

export type { HookEventName, HookHandler, HookPriority } from "../types/hook"

export type {
  BuiltinCategoryName,
  CategoryConfig,
  AvailableCategory,
} from "../types/category"

export type { GoatCodeConfig, AgentOverrides } from "../types/config"

/**
 * All 11 OpenCode hook handler names.
 * A PluginDefinition can contribute to any of these.
 */
export const HOOK_NAMES = [
  "tool",
  "config",
  "chat.message",
  "chat.params",
  "chat.headers",
  "event",
  "tool.execute.before",
  "tool.execute.after",
  "experimental.chat.messages.transform",
  "experimental.chat.system.transform",
  "tool.definition",
] as const satisfies readonly import("../types/hook").HookEventName[]

export type HookName = (typeof HOOK_NAMES)[number]
