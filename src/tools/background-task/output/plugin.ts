import { tool } from "@opencode-ai/plugin";
import { getBackgroundAgent } from "../../../runtime";
import type { OpenCodeContext } from "../../../types/plugin";
import { definePlugin } from "../../../plugin-api/define-plugin";
import { handleBackgroundOutput } from "./handler";
import type { BackgroundOutputArgs } from "./types";

let storedContext: OpenCodeContext | undefined;

const backgroundOutputTool = tool({
  description:
    "Get output from background task. Use full_session=true to fetch session messages with filters. System notifies on completion, so block=true rarely needed. - Timeout values are in milliseconds (ms), NOT seconds.",
  args: {
    task_id: tool.schema.string().describe("Task ID to get output from"),
    block: tool.schema
      .boolean()
      .optional()
      .describe(
        "Wait for completion (default: false). Capped at 55s to avoid tool-execution timeouts.",
      ),
    timeout: tool.schema
      .number()
      .optional()
      .describe("Max wait time in ms (default: 55000, max: 55000)"),
    full_session: tool.schema
      .boolean()
      .optional()
      .describe("Return full session messages with filters (default: false)"),
    include_thinking: tool.schema
      .boolean()
      .optional()
      .describe("Include thinking/reasoning parts in full_session output (default: false)"),
    message_limit: tool.schema
      .number()
      .optional()
      .describe("Max messages to return (capped at 100)"),
    since_message_id: tool.schema
      .string()
      .optional()
      .describe("Return messages after this message ID (exclusive)"),
    include_tool_results: tool.schema
      .boolean()
      .optional()
      .describe("Include tool results in full_session output (default: false)"),
    thinking_max_chars: tool.schema
      .number()
      .optional()
      .describe("Max characters for thinking content (default: 2000)"),
  },
  async execute(args: BackgroundOutputArgs) {
    const { manager } = getBackgroundAgent();
    return handleBackgroundOutput(manager, args, storedContext?.client);
  },
});

export default definePlugin({
  name: "background-output",
  version: "1.0.0",
  dependencies: ["delegate-task"],
  setup(ctx) {
    storedContext = ctx;
  },
  teardown() {
    storedContext = undefined;
  },
  tools: {
    background_output: backgroundOutputTool,
  },
});
