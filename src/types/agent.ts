import type { AgentConfig } from "@opencode-ai/sdk"

/** Re-export for convenience. */
export type { AgentConfig }

/**
 * Agent execution mode.
 * - "primary": Respects the user-selected UI model.
 * - "subagent": Uses its own fallback chain and ignores UI selection.
 * - "all": Available in both contexts.
 */
export type AgentMode = "primary" | "subagent" | "all"

/**
 * Factory function that creates an AgentConfig given a model string.
 * Includes a static mode property for pre-instantiation access.
 */
export type AgentFactory = ((model: string) => AgentConfig) & {
  readonly mode: AgentMode
}

/** All built-in OpenHead agent names. */
export type BuiltinAgentName =
  | "orchestrator"
  | "deep-worker"
  | "plan-builder"
  | "advisor"
  | "researcher"
  | "explorer"
  | "executor"
  | "analyst"
  | "reviewer"
  | "inspector"
  | "worker"

/** Agent override config for user customization. */
export interface AgentOverrideConfig {
  /** Override model identifier. */
  model?: string
  /** Override model variant. */
  variant?: string
  /** Override sampling temperature. */
  temperature?: number
  /** Override nucleus sampling value. */
  top_p?: number
  /** Additional prompt text appended to the system prompt. */
  prompt_append?: string
  /** Tool names explicitly denied for this agent. */
  denied_tools?: string[]
  /** Whether this agent is disabled. */
  disable?: boolean
  /** Custom fallback model chain. */
  fallback_models?: string | string[]
}

/** Agent contribution from a micro-plugin. */
export type PluginAgentContribution = AgentConfig
