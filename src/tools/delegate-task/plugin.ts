import type { OpenCodeContext } from "../../types/plugin";
import { definePlugin } from "../../plugin-api/define-plugin";
import { getBackgroundAgent, initBackgroundAgent, resetBackgroundAgent } from "../../runtime";
import { createTaskTool } from "./handler";

function getManagerOrThrow() {
  return getBackgroundAgent().manager;
}

let storedContext: OpenCodeContext | undefined;

export function getDelegateTaskContext(): OpenCodeContext | undefined {
  return storedContext;
}

export default definePlugin({
  name: "delegate-task",
  version: "1.0.0",
  setup(ctx) {
    storedContext = ctx;
    initBackgroundAgent();
  },
  teardown() {
    storedContext = undefined;
    resetBackgroundAgent();
  },
  tools: {
    task: createTaskTool(getManagerOrThrow, () => storedContext),
  },
});
