import { definePlugin } from "../../../plugin-api"
import { lspGotoDefinitionTool } from "./handler"

export const lspGotoDefinitionPlugin = definePlugin({
  name: "lsp-goto-definition",
  version: "0.1.0",
  tools: {
    lsp_goto_definition: lspGotoDefinitionTool,
  },
})
