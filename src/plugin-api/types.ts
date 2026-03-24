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
export { HOOK_EVENT_NAMES } from "../types/hook"
export { HOOK_EVENT_NAMES as HOOK_NAMES } from "../types/hook"
export type HookName = import("../types/hook").HookEventName

export type {
  BuiltinCategoryName,
  CategoryConfig,
  AvailableCategory,
} from "../types/category"

export type { GoatCodeConfig, AgentOverrides } from "../types/config"
