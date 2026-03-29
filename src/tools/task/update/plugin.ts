import { definePlugin } from "../../../plugin-api";
import { taskUpdateTool } from "./handler";

export const taskUpdatePlugin = definePlugin({
  name: "task-update",
  version: "0.1.0",
  tools: {
    task_update: taskUpdateTool,
  },
});
