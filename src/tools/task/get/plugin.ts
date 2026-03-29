import { definePlugin } from "../../../plugin-api";
import { taskGetTool } from "./handler";

export const taskGetPlugin = definePlugin({
  name: "task-get",
  version: "0.1.0",
  tools: {
    task_get: taskGetTool,
  },
});
