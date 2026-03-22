export type ToolRestriction = {
  denied?: string[]
  allowed?: string[]
}

const INSPECTOR_DENIED_TOOLS = [
  "write",
  "edit",
  "task",
  "bash",
  "glob",
  "grep",
  "lsp_goto_definition",
  "lsp_find_references",
  "lsp_symbols",
  "lsp_diagnostics",
  "lsp_prepare_rename",
  "lsp_rename",
  "call_omo_agent",
]

export const AGENT_TOOL_RESTRICTIONS: Record<string, ToolRestriction> = {
  advisor: { denied: ["write", "edit", "task"] },
  reviewer: { denied: ["write", "edit", "task"] },
  inspector: { denied: INSPECTOR_DENIED_TOOLS, allowed: ["read"] },
}

export function getToolRestrictions(agentName: string): ToolRestriction {
  return AGENT_TOOL_RESTRICTIONS[agentName] ?? { denied: [] }
}
