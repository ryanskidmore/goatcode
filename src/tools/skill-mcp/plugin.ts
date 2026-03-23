import { tool } from "@opencode-ai/plugin"
import { definePlugin } from "../../plugin-api/define-plugin"
import { executeSkillMcp } from "./handler"
import type { SkillMcpArgs } from "./types"

const SKILL_MCP_DESCRIPTION =
  "Invoke MCP server operations from skill-embedded MCPs. Requires mcp_name plus exactly one of: tool_name, resource_name, or prompt_name.\n\n" +
  "Pass `session_id=<id>` to continue previous agent with full context. Nested subagent depth is tracked automatically and blocked past the configured limit. Prompts MUST be in English. Use `background_output` for async results."

const skillMcpTool = tool({
  description: SKILL_MCP_DESCRIPTION,
  args: {
    mcp_name: tool.schema.string().describe("Name of the MCP server from skill config"),
    tool_name: tool.schema.string().optional().describe("MCP tool to call"),
    resource_name: tool.schema.string().optional().describe("MCP resource URI to read"),
    prompt_name: tool.schema.string().optional().describe("MCP prompt to get"),
    arguments: tool.schema
      .union([tool.schema.string(), tool.schema.object({})])
      .optional()
      .describe("JSON string or object of arguments"),
    grep: tool.schema
      .string()
      .optional()
      .describe("Regex pattern to filter output lines (only matching lines returned)"),
  },
  async execute(args: SkillMcpArgs) {
    return executeSkillMcp(args)
  },
})

export const skillMcpPlugin = definePlugin({
  name: "skill-mcp",
  version: "0.1.0",
  tools: {
    skill_mcp: skillMcpTool,
  },
})
