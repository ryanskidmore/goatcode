import { tool } from "@opencode-ai/plugin";
import { definePlugin } from "../../../plugin-api/define-plugin";
import { getSessionManagerContext } from "../client-context";
import { handleSessionSearch } from "./handler";
import type { SessionSearchArgs } from "./types";

const SESSION_SEARCH_DESCRIPTION = `Search for content within OpenCode session messages.

Performs full-text search across session messages and returns matching excerpts with context.

Arguments:
- query (required): Search query string
- session_id (optional): Search within specific session only (default: all sessions)
- case_sensitive (optional): Case-sensitive search (default: false)
- limit (optional): Maximum number of results to return (default: 20)

Example output:
Found 3 matches across sessions:

[ses_abc123] Message msg_001 (user)
  ...implement the session manager tool...
  Matches: 2

[ses_def456] Message msg_012 (user)
  ...use the session manager to find...
  Matches: 1`;

const sessionSearchTool = tool({
  description: SESSION_SEARCH_DESCRIPTION,
  args: {
    query: tool.schema.string().describe("Search query string"),
    session_id: tool.schema
      .string()
      .optional()
      .describe("Search within specific session only (default: all sessions)"),
    case_sensitive: tool.schema
      .boolean()
      .optional()
      .describe("Case-sensitive search (default: false)"),
    limit: tool.schema
      .number()
      .optional()
      .describe("Maximum number of results to return (default: 20)"),
  },
  async execute(args: SessionSearchArgs) {
    const ctx = getSessionManagerContext();
    return handleSessionSearch(args, ctx);
  },
});

export const sessionSearchPlugin = definePlugin({
  name: "session-search",
  version: "0.1.0",
  tools: {
    session_search: sessionSearchTool,
  },
});
