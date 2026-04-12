import type { ToolDefinition } from "@opencode-ai/plugin";

import { log } from "../../../shared/logger";
import { buildTool } from "../../tool-builder";
import { callLspClient, formatLspResult, getClientFromToolContext } from "../client";
import { lspRenameArgsSchema } from "./types";

const TOOL_NAME = "lsp_rename";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export const lspRenameTool: ToolDefinition = buildTool({
  name: TOOL_NAME,
  description: "Rename symbol across entire workspace. APPLIES changes to all files.",
  args: lspRenameArgsSchema.shape as unknown as ToolDefinition["args"],
  execute: async (args, ctx) => {
    try {
      const parsedArgs = lspRenameArgsSchema.parse(args);
      const client = getClientFromToolContext(ctx);
      const result = await callLspClient(client, TOOL_NAME, "lspRename", parsedArgs);

      if (result === null || result === undefined) {
        return "No rename changes produced";
      }

      return formatLspResult(result);
    } catch (error) {
      const message = errorMessage(error);
      log("[lsp_rename] execution failed", { error: message });
      return `Error: ${message}`;
    }
  },
});
