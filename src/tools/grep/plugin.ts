import { definePlugin } from "../../plugin-api";
import { createGrepTool } from "./handler";

export const grepPlugin = definePlugin({
  name: "grep",
  version: "0.1.0",
  tools: {
    grep: createGrepTool(),
  },
});
