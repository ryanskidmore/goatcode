import { definePlugin } from "../../plugin-api";
import { EXPLORER_TEMPERATURE, EXPLORER_MODE, EXPLORER_DEFAULT_MODEL } from "./config";
import { EXPLORER_PROMPT } from "./prompt";
import { buildToolsMap } from "../tool-restrictions";

export const explorerPlugin = definePlugin({
  name: "explorer",
  version: "0.1.0",
  agents: {
    explorer: {
      model: EXPLORER_DEFAULT_MODEL,
      temperature: EXPLORER_TEMPERATURE,
      mode: EXPLORER_MODE,
      prompt: EXPLORER_PROMPT,
      tools: buildToolsMap("explorer"),
    },
  },
});
