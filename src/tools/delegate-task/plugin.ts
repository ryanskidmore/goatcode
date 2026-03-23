import { definePlugin } from "../../plugin-api/define-plugin"
import { BackgroundAgentManager } from "../../features/background-agent/manager"
import { createTaskTool } from "./handler"

const manager = new BackgroundAgentManager()

export default definePlugin({
  name: "delegate-task",
  version: "1.0.0",
  tools: {
    task: createTaskTool(manager),
  },
})
