import { tool } from "@opencode-ai/plugin";
import { definePlugin } from "../../../plugin-api/define-plugin";
import { getSessionManagerContext } from "../client-context";
import { handleSessionRead } from "./handler";
import type { SessionReadArgs } from "./types";
import { DEFAULT_TOOL_TIMEOUT_MS, withToolTimeout } from "../../tool-timeout";

const SESSION_READ_DESCRIPTION = `Read messages and history from an OpenCode session.

Returns a formatted view of session messages with role, timestamp, and content. Optionally includes todos.

Arguments:
- session_id (required): Session ID to read
- include_todos (optional): Include todo list if available (default: false)
- limit (optional): Maximum number of messages to return (default: all)

Example output:
Session: ses_abc123
Messages: 45
Date Range: 2025-12-20 10:30:00 to 2025-12-24 15:45:30

[Message 1] user (2025-12-20 10:30:00)
Hello, can you help me with...

[Message 2] assistant (2025-12-20 10:30:15)
Of course! Let me help you with...`;

const sessionReadTool = tool({
  description: SESSION_READ_DESCRIPTION,
  args: {
    session_id: tool.schema.string().describe("Session ID to read"),
    include_todos: tool.schema
      .boolean()
      .optional()
      .describe("Include todo list if available (default: false)"),
    limit: tool.schema
      .number()
      .optional()
      .describe("Maximum number of messages to return (default: all)"),
  },
  async execute(args: SessionReadArgs) {
    const ctx = getSessionManagerContext();
    return withToolTimeout("session_read", DEFAULT_TOOL_TIMEOUT_MS, handleSessionRead(args, ctx));
  },
});

export const sessionReadPlugin = definePlugin({
  name: "session-read",
  version: "0.1.0",
  tools: {
    session_read: sessionReadTool,
  },
});
