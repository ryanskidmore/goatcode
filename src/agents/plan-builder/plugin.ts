import { definePlugin } from "../../plugin-api";
import { PLAN_BUILDER_TEMPERATURE, PLAN_BUILDER_MODE } from "./config";
import { PLAN_BUILDER_PROMPT } from "./prompt";

export const planBuilderPlugin = definePlugin({
  name: "planner",
  version: "0.1.0",
  agents: {
    planner: {
      temperature: PLAN_BUILDER_TEMPERATURE,
      mode: PLAN_BUILDER_MODE,
      prompt: PLAN_BUILDER_PROMPT,
      color: "#047857",
    },
  },
});
