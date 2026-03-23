import type { ToolDefinition } from "@opencode-ai/plugin"

import { log } from "../../../shared/logger"
import { buildTool } from "../../tool-builder"
import { callLspClient, formatLspResult, getClientFromToolContext } from "../client"
import { lspFindReferencesArgsSchema } from "./types"

const TOOL_NAME = "lsp_find_references"

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export const lspFindReferencesTool: ToolDefinition = buildTool({
  description: "Find ALL usages/references of a symbol across the entire workspace.",
  args: lspFindReferencesArgsSchema.shape as unknown as ToolDefinition["args"],
  execute: async (args, ctx) => {
    try {
      const parsedArgs = lspFindReferencesArgsSchema.parse(args)
      const client = getClientFromToolContext(ctx)
      const result = await callLspClient(client, TOOL_NAME, "lspFindReferences", parsedArgs)

      if (result === null || result === undefined || (Array.isArray(result) && result.length === 0)) {
        return "No references found"
      }

      return formatLspResult(result)
    } catch (error) {
      const message = errorMessage(error)
      log("[lsp_find_references] execution failed", { error: message })
      return `Error: ${message}`
    }
  },
})
