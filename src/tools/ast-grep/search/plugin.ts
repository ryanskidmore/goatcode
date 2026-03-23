import { definePlugin } from "../../../plugin-api"
import { createAstGrepSearchTool } from "./handler"

export const astGrepSearchPlugin = definePlugin({
  name: "ast-grep-search",
  version: "0.1.0",
  tools: {
    ast_grep_search: createAstGrepSearchTool(),
  },
})
