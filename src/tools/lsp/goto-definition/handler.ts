import type { ToolDefinition } from "@opencode-ai/plugin"
import { log } from "../../../shared/logger"
import { buildTool } from "../../tool-builder"
import { callLspClient, formatLspResult, getClientFromToolContext } from "../client"
import type { LspGotoDefinitionArgs } from "./types"
import { lspGotoDefinitionArgsSchema } from "./types"

const TOOL_NAME = "lsp_goto_definition"

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export const lspGotoDefinitionTool: ToolDefinition = buildTool({
  description: "Jump to symbol definition. Find WHERE something is defined.",
  args: lspGotoDefinitionArgsSchema.shape as unknown as ToolDefinition["args"],
  execute: async (args, ctx) => {
    try {
      const parsedArgs = lspGotoDefinitionArgsSchema.parse(args) as LspGotoDefinitionArgs
      const client = getClientFromToolContext(ctx)
      const result = await callLspClient(client, TOOL_NAME, "lspGotoDefinition", parsedArgs)

      if (result === null || result === undefined || (Array.isArray(result) && result.length === 0)) {
        return "No definition found"
      }

      return formatLspResult(result)
    } catch (error) {
      const message = errorMessage(error)
      log("[lsp_goto_definition] execution failed", { error: message })
      return `Error: ${message}`
    }
  },
})
