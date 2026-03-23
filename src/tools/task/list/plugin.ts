import { definePlugin } from "../../../plugin-api"
import { taskListTool } from "./handler"

export const taskListPlugin = definePlugin({
  name: "task-list",
  version: "0.1.0",
  tools: {
    task_list: taskListTool,
  },
})
