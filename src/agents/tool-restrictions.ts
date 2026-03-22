export type ToolRestriction = {
  denied?: string[]
  allowed?: string[]
}

const ALL_KNOWN_TOOLS = [
  "read", "write", "edit", "bash", "glob", "grep",
  "task", "todowrite",
  "lsp_goto_definition", "lsp_find_references", "lsp_symbols",
  "lsp_diagnostics", "lsp_prepare_rename", "lsp_rename",
  "ast_grep_search", "ast_grep_replace",
  "webfetch", "websearch", "codesearch",
]

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

  if (restriction.allowed) {
    for (const tool of ALL_KNOWN_TOOLS) {
      tools[tool] = false
    }
    for (const tool of restriction.allowed) {
      tools[tool] = true
    }
  } else if (restriction.denied) {
    for (const tool of restriction.denied) {
      tools[tool] = false
    }
  }

  return Object.keys(tools).length > 0 ? tools : undefined
}
