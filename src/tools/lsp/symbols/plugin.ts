import { definePlugin } from "../../../plugin-api"
import { lspSymbolsTool } from "./handler"

export const lspSymbolsPlugin = definePlugin({
  name: "lsp-symbols",
  version: "0.1.0",
  tools: {
    lsp_symbols: lspSymbolsTool,
  },
})
