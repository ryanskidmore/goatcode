import { definePlugin } from "../../plugin-api";
import { ORCHESTRATOR_MODEL, ORCHESTRATOR_TEMPERATURE, ORCHESTRATOR_MODE } from "./config";
import { ORCHESTRATOR_PROMPT } from "./prompt";

export const orchestratorPlugin = definePlugin({
  name: "orchestrator",
  version: "0.1.0",
  agents: {
    orchestrator: {
      model: ORCHESTRATOR_MODEL,
      temperature: ORCHESTRATOR_TEMPERATURE,
      mode: ORCHESTRATOR_MODE,
      prompt: ORCHESTRATOR_PROMPT,
    },
  },
});
