import { tool } from "@opencode-ai/plugin"
import { definePlugin } from "../../../plugin-api/define-plugin"
import { getSessionManagerContext } from "../client-context"
import { handleSessionInfo } from "./handler"
import type { SessionInfoArgs } from "./types"

const SESSION_INFO_DESCRIPTION = `Get metadata and statistics about an OpenCode session.

Returns detailed information about a session including message count, date range, agents used, and available data sources.

Arguments:
- session_id (required): Session ID to inspect

Example output:
Session ID: ses_abc123
Messages: 45
Date Range: 2025-12-20 to 2025-12-24
Duration: 4 days, 5 hours
Agents Used: build, oracle
Has Todos: Yes (12 items, 8 completed)
Has Transcript: Yes`

const sessionInfoTool = tool({
  description: SESSION_INFO_DESCRIPTION,
  args: {
    session_id: tool.schema.string().describe("Session ID to inspect"),
  },
  async execute(args: SessionInfoArgs) {
    const ctx = getSessionManagerContext()
    return handleSessionInfo(args, ctx)
  },
})

export const sessionInfoPlugin = definePlugin({
  name: "session-info",
  version: "0.1.0",
  tools: {
    session_info: sessionInfoTool,
  },
})
