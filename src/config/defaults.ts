import type { GoatCodeConfig } from "../types/config";

export const DEFAULT_TEMPERATURE = 0.1;

export const CONFIG_DEFAULTS: Required<
  Pick<
    GoatCodeConfig,
    | "auto_update"
    | "default_temperature"
    | "disabled_agents"
    | "disabled_hooks"
    | "disabled_tools"
    | "disabled_skills"
  >
> = {
  auto_update: true,
  default_temperature: DEFAULT_TEMPERATURE,
  disabled_agents: [],
  disabled_hooks: [],
  disabled_tools: [],
  disabled_skills: [],
};
