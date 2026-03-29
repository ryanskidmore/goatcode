import { definePlugin } from "../../plugin-api";
import { createGlobTool } from "./handler";

export const globPlugin = definePlugin({
  name: "glob",
  version: "0.1.0",
  tools: {
    glob: createGlobTool(),
  },
});
