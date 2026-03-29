import { definePlugin } from "../../plugin-api/define-plugin";
import { getBackgroundAgent, initBackgroundAgent, resetBackgroundAgent } from "../../runtime";
import { createTaskTool } from "./handler";

function getManagerOrThrow() {
  return getBackgroundAgent().manager;
}

export default definePlugin({
  name: "delegate-task",
  version: "1.0.0",
  setup() {
    initBackgroundAgent();
  },
  teardown() {
    resetBackgroundAgent();
  },
  tools: {
    task: createTaskTool(getManagerOrThrow),
  },
});
