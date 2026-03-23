import type { ToolDefinition } from "@opencode-ai/plugin"

import { log } from "../../../shared/logger"
import { buildTool } from "../../tool-builder"
import { callLspClient, formatLspResult, getClientFromToolContext } from "../client"
import { lspSymbolsArgsSchema } from "./types"

const TOOL_NAME = "lsp_symbols"

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export const lspSymbolsTool: ToolDefinition = buildTool({
  description:
    "Get symbols from file (document) or search across workspace. Use scope='document' for file outline, scope='workspace' for project-wide symbol search.",
  args: lspSymbolsArgsSchema.shape as unknown as ToolDefinition["args"],
  execute: async (args, ctx) => {
    try {
      const parsedArgs = lspSymbolsArgsSchema.parse(args)
      if (parsedArgs.scope === "workspace" && !parsedArgs.query) {
        return "Error: 'query' is required for workspace scope"
      }

      const client = getClientFromToolContext(ctx)
      const result = await callLspClient(client, TOOL_NAME, "lspSymbols", parsedArgs)

      if (result === null || result === undefined || (Array.isArray(result) && result.length === 0)) {
        return "No symbols found"
      }

      return formatLspResult(result)
    } catch (error) {
      const message = errorMessage(error)
      log("[lsp_symbols] execution failed", { error: message })
      return `Error: ${message}`
    }
  },
})
