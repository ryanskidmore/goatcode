import { definePlugin } from "../../plugin-api";
import { EXPLORER_TEMPERATURE, EXPLORER_MODE } from "./config";
import { EXPLORER_PROMPT } from "./prompt";

export const explorerPlugin = definePlugin({
  name: "explorer",
  version: "0.1.0",
  agents: {
    explorer: {
      temperature: EXPLORER_TEMPERATURE,
      mode: EXPLORER_MODE,
      prompt: EXPLORER_PROMPT,
    },
  },
});
