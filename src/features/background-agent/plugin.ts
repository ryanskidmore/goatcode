import { definePlugin } from "../../plugin-api";
import { createBackgroundAgentEventHook } from "./event-hook";

export const backgroundAgentPlugin = definePlugin({
  name: "background-agent-events",
  version: "0.1.0",
  hooks: {
    event: createBackgroundAgentEventHook(),
  },
});
