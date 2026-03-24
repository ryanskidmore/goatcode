import { tool } from "@opencode-ai/plugin"
import type { OpenCodeContext } from "../../../types/plugin"
import type { BackgroundAgentManager } from "../../../features/background-agent/manager"
import { getBackgroundAgent } from "../../../features/background-agent/singleton"
import { definePlugin } from "../../../plugin-api/define-plugin"
import { handleBackgroundCancel } from "./handler"
import type { BackgroundCancelArgs } from "./types"

let manager: BackgroundAgentManager | undefined

const backgroundCancelTool = tool({
  description: "Cancel running background task(s). Use all=true to cancel ALL before final answer.",
  args: {
    task_id: tool.schema.string().optional().describe("Task ID to cancel (required if all=false)"),
    all: tool.schema.boolean().optional().describe("Cancel all running background tasks (default: false)"),
  },
  async execute(args: BackgroundCancelArgs, toolContext) {
    if (!manager) {
      throw new Error("BackgroundAgent not initialized. Ensure delegate-task plugin setup has run.")
    }

    return handleBackgroundCancel(manager, toolContext as unknown as OpenCodeContext, args)
  },
})

export default definePlugin({
  name: "background-cancel",
  version: "1.0.0",
  dependencies: ["delegate-task"],
  setup() {
    manager = getBackgroundAgent().manager
  },
  teardown() {
    manager = undefined
  },
  tools: {
    background_cancel: backgroundCancelTool,
  },
})
