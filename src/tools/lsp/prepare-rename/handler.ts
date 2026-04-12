import type { ToolDefinition } from "@opencode-ai/plugin";

import { log } from "../../../shared/logger";
import { buildTool } from "../../tool-builder";
import { callLspClient, formatLspResult, getClientFromToolContext } from "../client";
import { lspPrepareRenameArgsSchema } from "./types";

const TOOL_NAME = "lsp_prepare_rename";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export const lspPrepareRenameTool: ToolDefinition = buildTool({
  name: TOOL_NAME,
  description: "Check if rename is valid. Use BEFORE lsp_rename.",
  args: lspPrepareRenameArgsSchema.shape as unknown as ToolDefinition["args"],
  execute: async (args, ctx) => {
    try {
      const parsedArgs = lspPrepareRenameArgsSchema.parse(args);
      const client = getClientFromToolContext(ctx);
      const result = await callLspClient(client, TOOL_NAME, "lspPrepareRename", parsedArgs);

      if (
        result === null ||
        result === undefined ||
        (Array.isArray(result) && result.length === 0)
      ) {
        return "Rename is not valid at this position";
      }

      return formatLspResult(result);
    } catch (error) {
      const message = errorMessage(error);
      log("[lsp_prepare_rename] execution failed", { error: message });
      return `Error: ${message}`;
    }
  },
});
