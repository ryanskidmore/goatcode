export type ToolRestriction = {
  denied?: string[]
  allowed?: string[]
}

export const AGENT_TOOL_RESTRICTIONS: Record<string, ToolRestriction> = {
  advisor: { denied: ["write", "edit", "task"] },
  reviewer: { denied: ["write", "edit", "task"] },
  inspector: { allowed: ["read"] },
}

export function getToolRestrictions(agentName: string): ToolRestriction {
  return AGENT_TOOL_RESTRICTIONS[agentName] ?? { denied: [] }
}

export function buildToolsMap(agentName: string): Record<string, boolean> | undefined {
  const restriction = AGENT_TOOL_RESTRICTIONS[agentName]
  if (!restriction) return undefined

  const tools: Record<string, boolean> = {}
  if (restriction.denied) {
    for (const tool of restriction.denied) {
      tools[tool] = false
    }
  }
  if (restriction.allowed) {
    for (const tool of restriction.allowed) {
      tools[tool] = true
    }
  }
  return Object.keys(tools).length > 0 ? tools : undefined
}
