import { definePlugin } from "../../plugin-api";
import { ADVISOR_TEMPERATURE, ADVISOR_MODE } from "./config";
import { ADVISOR_PROMPT } from "./prompt";
import { buildToolsMap } from "../tool-restrictions";

export const advisorPlugin = definePlugin({
  name: "advisor",
  version: "0.1.0",
  agents: {
    advisor: {
      temperature: ADVISOR_TEMPERATURE,
      mode: ADVISOR_MODE,
      prompt: ADVISOR_PROMPT,
      tools: buildToolsMap("advisor"),
    },
  },
});
