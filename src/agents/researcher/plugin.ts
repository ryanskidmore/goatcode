import { definePlugin } from "../../plugin-api";
import { RESEARCHER_TEMPERATURE, RESEARCHER_MODE } from "./config";
import { RESEARCHER_PROMPT } from "./prompt";

export const researcherPlugin = definePlugin({
  name: "researcher",
  version: "0.1.0",
  agents: {
    researcher: {
      temperature: RESEARCHER_TEMPERATURE,
      mode: RESEARCHER_MODE,
      prompt: RESEARCHER_PROMPT,
      color: "#EA580C",
    },
  },
});
