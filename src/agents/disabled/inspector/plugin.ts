import { definePlugin } from "../../plugin-api";
import { INSPECTOR_MODEL, INSPECTOR_TEMPERATURE, INSPECTOR_MODE } from "./config";
import { INSPECTOR_PROMPT } from "./prompt";
import { buildToolsMap } from "../tool-restrictions";

export const inspectorPlugin = definePlugin({
  name: "inspector",
  version: "0.1.0",
  agents: {
    inspector: {
      model: INSPECTOR_MODEL,
      temperature: INSPECTOR_TEMPERATURE,
      mode: INSPECTOR_MODE,
      prompt: INSPECTOR_PROMPT,
      tools: buildToolsMap("inspector"),
    },
  },
});
