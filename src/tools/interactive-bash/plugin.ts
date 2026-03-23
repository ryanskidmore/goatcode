import { definePlugin } from "../../plugin-api"
import { interactiveBashTool } from "./handler"

export const interactiveBashPlugin = definePlugin({
  name: "interactive-bash",
  version: "0.1.0",
  tools: {
    interactive_bash: interactiveBashTool,
  },
})
