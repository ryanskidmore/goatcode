import { definePlugin } from "../../plugin-api";
import { lookAtTool } from "./handler";

export const lookAtPlugin = definePlugin({
  name: "look-at",
  version: "0.1.0",
  tools: {
    look_at: lookAtTool,
  },
});
