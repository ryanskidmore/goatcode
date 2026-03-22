import type { OpenHeadConfig } from "../types/config"

export const CONFIG_DEFAULTS: Required<
  Pick<
    OpenHeadConfig,
    "auto_update" | "disabled_agents" | "disabled_hooks" | "disabled_tools" | "disabled_skills"
  >
> = {
  auto_update: true,
  disabled_agents: [],
  disabled_hooks: [],
  disabled_tools: [],
  disabled_skills: [],
}
