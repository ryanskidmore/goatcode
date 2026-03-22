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
