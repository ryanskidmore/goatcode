import type { AgentConfig } from "@opencode-ai/sdk"
import type { AgentFactory, AgentOverrideConfig } from "../types/agent"
import type { CategoryConfig } from "../types/category"

export type AgentSource = AgentFactory | AgentConfig

export function isAgentFactory(source: AgentSource): source is AgentFactory {
  return typeof source === "function"
}

function appendPrompt(basePrompt: string | undefined, appendText: string): string {
  if (!basePrompt) return appendText
  return `${basePrompt}\n\n${appendText}`
}

export function buildAgent(
  source: AgentSource,
  model: string,
  categoryConfig?: CategoryConfig,
  overrides?: AgentOverrideConfig,
): AgentConfig {
  const base: AgentConfig = isAgentFactory(source)
    ? source(model)
    : {
        ...source,
        tools: source.tools ? { ...source.tools } : undefined,
      }

  if (categoryConfig) {
    if (!base.model && categoryConfig.model) {
      base.model = categoryConfig.model
    }

    if (categoryConfig.prompt_append) {
      base.prompt = appendPrompt(base.prompt, categoryConfig.prompt_append)
    }

    if (base["variant"] === undefined && categoryConfig.variant !== undefined) {
      base["variant"] = categoryConfig.variant
    }
  }

  if (overrides) {
    if (overrides.model) {
      base.model = overrides.model
    }

    if (overrides.temperature !== undefined) {
      base.temperature = overrides.temperature
    }

    if (overrides.top_p !== undefined) {
      base.top_p = overrides.top_p
    }

    if (overrides.prompt_append) {
      base.prompt = appendPrompt(base.prompt, overrides.prompt_append)
    }

    if (overrides.variant !== undefined) {
      base["variant"] = overrides.variant
    }

    if (overrides.disable !== undefined) {
      base.disable = overrides.disable
    }

    if (overrides.denied_tools?.length) {
      const tools: Record<string, boolean> = { ...(base.tools ?? {}) }
      for (const deniedTool of overrides.denied_tools) {
        tools[deniedTool] = false
      }
      base.tools = tools
    }
  }

  return base
}
