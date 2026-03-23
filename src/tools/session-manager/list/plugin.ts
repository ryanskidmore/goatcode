import { tool } from "@opencode-ai/plugin"
import { definePlugin } from "../../../plugin-api/define-plugin"
import { getSessionManagerContext } from "../client-context"
import { handleSessionList } from "./handler"
import type { SessionListArgs } from "./types"

const SESSION_LIST_DESCRIPTION = `List all OpenCode sessions with optional filtering.

Returns a list of available session IDs with metadata including message count, date range, and agents used.

Arguments:
- limit (optional): Maximum number of sessions to return
- from_date (optional): Filter sessions from this date (ISO 8601 format)
- to_date (optional): Filter sessions until this date (ISO 8601 format)
- project_path (optional): Filter sessions by project path (default: current working directory)

Example output:
| Session ID | Messages | First | Last | Agents |
|------------|----------|-------|------|--------|
| ses_abc123 | 45 | 2025-12-20 | 2025-12-24 | build, oracle |
| ses_def456 | 12 | 2025-12-19 | 2025-12-19 | build |`

const sessionListTool = tool({
  description: SESSION_LIST_DESCRIPTION,
  args: {
    limit: tool.schema.number().optional().describe("Maximum number of sessions to return"),
    from_date: tool.schema.string().optional().describe("Filter sessions from this date (ISO 8601 format)"),
    to_date: tool.schema.string().optional().describe("Filter sessions until this date (ISO 8601 format)"),
    project_path: tool.schema.string().optional().describe("Filter sessions by project path (default: current working directory)"),
  },
  async execute(args: SessionListArgs) {
    const ctx = getSessionManagerContext()
    return handleSessionList(args, ctx)
  },
})

export const sessionListPlugin = definePlugin({
  name: "session-list",
  version: "0.1.0",
  tools: {
    session_list: sessionListTool,
  },
})
