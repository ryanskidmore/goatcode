export type ToolRestriction = {
  denied?: string[];
  allowed?: string[];
};

const ALL_KNOWN_TOOLS = [
  // Core file operations (OpenCode built-ins)
  "read",
  "write",
  "edit",
  "bash",
  "glob",
  "grep",
  "task",
  "todowrite",
  // LSP tools
  "lsp_goto_definition",
  "lsp_find_references",
  "lsp_symbols",
  "lsp_diagnostics",
  "lsp_prepare_rename",
  "lsp_rename",
  // AST tools
  "ast_grep_search",
  "ast_grep_replace",
  // Web tools
  "webfetch",
  "websearch",
  "codesearch",
  // GoatCode custom tools
  "hashline_edit",
  "interactive_bash",
  "look_at",
  "delegate_task",
  "background_output",
  "background_cancel",
  "session_list",
  "session_read",
  "session_search",
  "session_info",
  "skill",
  "skill_mcp",
  "task_create",
  "task_list",
  "task_get",
  "task_update",
];

export const AGENT_TOOL_RESTRICTIONS: Record<string, ToolRestriction> = {
  advisor: {
    denied: [
      "write",
      "edit",
      "bash",
      "interactive_bash",
      "delegate_task",
      "task_create",
      "task_update",
    ],
  },
};

export function getToolRestrictions(agentName: string): ToolRestriction {
  return AGENT_TOOL_RESTRICTIONS[agentName] ?? { denied: [] };
}

export function buildToolsMap(agentName: string): Record<string, boolean> | undefined {
  const restriction = AGENT_TOOL_RESTRICTIONS[agentName];
  if (!restriction) return undefined;

  const tools: Record<string, boolean> = {};

  if (restriction.allowed) {
    for (const tool of ALL_KNOWN_TOOLS) {
      tools[tool] = false;
    }
    for (const tool of restriction.allowed) {
      tools[tool] = true;
    }
  } else if (restriction.denied) {
    for (const tool of restriction.denied) {
      tools[tool] = false;
    }
  }

  return Object.keys(tools).length > 0 ? tools : undefined;
}
