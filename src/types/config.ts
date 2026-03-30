import type { AgentOverrideConfig, BuiltinAgentName } from "./agent";
import type { BuiltinCategoryName, CategoryConfig } from "./category";

/** Partial agent overrides where each built-in agent can be partially overridden. */
export type AgentOverrides = Partial<Record<BuiltinAgentName, AgentOverrideConfig>>;

/** Partial category overrides for built-in categories. */
export type CategoryOverrides = Partial<Record<BuiltinCategoryName, CategoryConfig>>;

/**
 * Top-level GoatCode configuration shape.
 * Runtime validation and defaults are handled by the config schema layer.
 */
export interface GoatCodeConfig {
  agents?: AgentOverrides;
  categories?: CategoryOverrides;
  default_temperature?: number;
  default_provider?: string;
  provider_priority?: string[];
  disabled_agents?: string[];
  disabled_hooks?: string[];
  disabled_tools?: string[];
  disabled_skills?: string[];
  auto_update?: boolean;
  plugins?: string[];
}
