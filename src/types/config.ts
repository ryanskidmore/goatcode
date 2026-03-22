import type { AgentOverrideConfig, BuiltinAgentName } from "./agent"
import type { BuiltinCategoryName, CategoryConfig } from "./category"

/** Partial agent overrides where each built-in agent can be partially overridden. */
export type AgentOverrides = Partial<Record<BuiltinAgentName, AgentOverrideConfig>>

/** Partial category overrides for built-in categories. */
export type CategoryOverrides = Partial<Record<BuiltinCategoryName, CategoryConfig>>

/**
 * Top-level OpenHead configuration shape.
 * Runtime validation and defaults are handled by the config schema layer.
 */
export interface OpenHeadConfig {
  /** Agent model and behavior overrides. */
  agents?: AgentOverrides
  /** Category model and behavior overrides. */
  categories?: CategoryOverrides
  /** Agent names to disable. */
  disabled_agents?: string[]
  /** Hook names to disable. */
  disabled_hooks?: string[]
  /** Tool names to disable. */
  disabled_tools?: string[]
  /** Skill names to disable. */
  disabled_skills?: string[]
  /** Whether auto-update checks are enabled. */
  auto_update?: boolean
  /** External micro-plugin package names to load. */
  plugins?: string[]
}
