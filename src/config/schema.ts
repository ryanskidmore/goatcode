import { z } from "zod";
import { CONFIG_DEFAULTS } from "./defaults";

export const AgentOverrideConfigSchema = z.object({
  model: z.string().optional(),
  variant: z.string().optional(),
  temperature: z.number().optional(),
  top_p: z.number().optional(),
  prompt_append: z.string().optional(),
  denied_tools: z.array(z.string()).optional(),
  disable: z.boolean().optional(),
  fallback_models: z.union([z.string(), z.array(z.string())]).optional(),
});

export const CategoryConfigSchema = z.object({
  model: z.string().optional(),
  variant: z.string().optional(),
  description: z.string().optional(),
  prompt_append: z.string().optional(),
});

export const AgentOverridesSchema = z.object({
  orchestrator: AgentOverrideConfigSchema.optional(),
  deepworker: AgentOverrideConfigSchema.optional(),
  planner: AgentOverrideConfigSchema.optional(),
  advisor: AgentOverrideConfigSchema.optional(),
  researcher: AgentOverrideConfigSchema.optional(),
  explorer: AgentOverrideConfigSchema.optional(),
  worker: AgentOverrideConfigSchema.optional(),
});

export const CategoryOverridesSchema = z.object({
  "visual-engineering": CategoryConfigSchema.optional(),
  ultrabrain: CategoryConfigSchema.optional(),
  deep: CategoryConfigSchema.optional(),
  artistry: CategoryConfigSchema.optional(),
  quick: CategoryConfigSchema.optional(),
  "unspecified-low": CategoryConfigSchema.optional(),
  "unspecified-high": CategoryConfigSchema.optional(),
  writing: CategoryConfigSchema.optional(),
});

export const GoatCodeConfigSchema = z.object({
  agents: AgentOverridesSchema.optional(),
  categories: CategoryOverridesSchema.optional(),
  default_temperature: z.number().min(0).max(2).default(CONFIG_DEFAULTS.default_temperature),
  default_provider: z.string().optional(),
  provider_priority: z.array(z.string()).default(CONFIG_DEFAULTS.provider_priority),
  disabled_agents: z.array(z.string()).default(CONFIG_DEFAULTS.disabled_agents),
  disabled_hooks: z.array(z.string()).default(CONFIG_DEFAULTS.disabled_hooks),
  disabled_tools: z.array(z.string()).default(CONFIG_DEFAULTS.disabled_tools),
  disabled_skills: z.array(z.string()).default(CONFIG_DEFAULTS.disabled_skills),
  auto_update: z.boolean().default(CONFIG_DEFAULTS.auto_update),
  plugins: z.array(z.string()).optional(),
});

export type GoatCodeConfigInput = z.input<typeof GoatCodeConfigSchema>;
