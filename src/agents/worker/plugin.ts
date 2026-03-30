import { definePlugin } from "../../plugin-api";
import { WORKER_TEMPERATURE, WORKER_MODE } from "./config";
import { WORKER_PROMPT } from "./prompt";

export const workerPlugin = definePlugin({
  name: "worker",
  version: "0.1.0",
  agents: {
    worker: {
      temperature: WORKER_TEMPERATURE,
      mode: WORKER_MODE,
      prompt: WORKER_PROMPT,
    },
  },
});
