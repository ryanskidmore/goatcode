import type { ToolDefinition } from "@opencode-ai/plugin"

import { log } from "../../../shared/logger"
import { buildTool } from "../../tool-builder"
import { callLspClient, formatLspResult, getClientFromToolContext } from "../client"
import { lspDiagnosticsArgsSchema } from "./types"

const TOOL_NAME = "lsp_diagnostics"

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export const lspDiagnosticsTool: ToolDefinition = buildTool({
  description:
    'Get errors, warnings, hints from language server BEFORE running build. For directories, provide \'extension\' parameter (e.g., extension=".ts").',
  args: lspDiagnosticsArgsSchema.shape as unknown as ToolDefinition["args"],
  execute: async (args, ctx) => {
    try {
      const parsedArgs = lspDiagnosticsArgsSchema.parse(args)
      const client = getClientFromToolContext(ctx)
      const result = await callLspClient(client, TOOL_NAME, "lspDiagnostics", parsedArgs)

      if (result === null || result === undefined || (Array.isArray(result) && result.length === 0)) {
        return "No diagnostics found"
      }

      return formatLspResult(result)
    } catch (error) {
      const message = errorMessage(error)
      log("[lsp_diagnostics] execution failed", { error: message })
      return `Error: ${message}`
    }
  },
})
