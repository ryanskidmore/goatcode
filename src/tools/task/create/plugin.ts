import { definePlugin } from "../../../plugin-api";
import { taskCreateTool } from "./handler";

export const taskCreatePlugin = definePlugin({
  name: "task-create",
  version: "0.1.0",
  tools: {
    task_create: taskCreateTool,
  },
});
