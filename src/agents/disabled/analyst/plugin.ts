import { definePlugin } from "../../plugin-api";
import { ANALYST_MODEL, ANALYST_TEMPERATURE, ANALYST_MODE } from "./config";
import { ANALYST_PROMPT } from "./prompt";

export const analystPlugin = definePlugin({
  name: "analyst",
  version: "0.1.0",
  agents: {
    analyst: {
      model: ANALYST_MODEL,
      temperature: ANALYST_TEMPERATURE,
      mode: ANALYST_MODE,
      prompt: ANALYST_PROMPT,
    },
  },
});
