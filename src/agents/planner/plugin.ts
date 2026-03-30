import { definePlugin } from "../../plugin-api";
import { PLANNER_TEMPERATURE, PLANNER_MODE } from "./config";
import { PLANNER_PROMPT } from "./prompt";

export const plannerPlugin = definePlugin({
  name: "planner",
  version: "0.1.0",
  agents: {
    planner: {
      temperature: PLANNER_TEMPERATURE,
      mode: PLANNER_MODE,
      prompt: PLANNER_PROMPT,
      color: "#047857",
    },
  },
});
