import { tool } from "@opencode-ai/plugin"
import {
  backgroundAgentManager,
  getBackgroundAgentContext,
} from "../../../features/background-agent/singleton"
import { definePlugin } from "../../../plugin-api/define-plugin"
import { handleBackgroundCancel } from "./handler"
import type { BackgroundCancelArgs } from "./types"

const backgroundCancelTool = tool({
  description: "Cancel running background task(s). Use all=true to cancel ALL before final answer.",
  args: {
    task_id: tool.schema.string().optional().describe("Task ID to cancel (required if all=false)"),
    all: tool.schema.boolean().optional().describe("Cancel all running background tasks (default: false)"),
  },
  async execute(args: BackgroundCancelArgs) {
    const ctx = getBackgroundAgentContext()
    return handleBackgroundCancel(backgroundAgentManager, ctx, args)
  },
})

export default definePlugin({
  name: "background-cancel",
  version: "1.0.0",
  tools: {
    background_cancel: backgroundCancelTool,
  },
})
