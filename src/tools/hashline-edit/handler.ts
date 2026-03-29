import { readFile, writeFile } from "node:fs/promises";
import type { ToolDefinition } from "@opencode-ai/plugin";
import { log } from "../../shared/logger";
import { applyHashlineEdits } from "./edit-operations";
import type { HashlineEditToolArgs } from "./types";

type ToolContext = Parameters<ToolDefinition["execute"]>[1];

export async function executeHashlineEdit(
  args: HashlineEditToolArgs,
  _context: ToolContext,
): Promise<string> {
  log("hashline_edit.start", { filePath: args.filePath, editCount: args.edits.length });

  try {
    const existing = await readFile(args.filePath, "utf8");
    const updated = applyHashlineEdits(existing, args.edits);

    if (updated === existing) {
      log("hashline_edit.noop", { filePath: args.filePath });
      return "No changes applied";
    }

    await writeFile(args.filePath, updated, "utf8");
    log("hashline_edit.success", { filePath: args.filePath, editCount: args.edits.length });

    return `Applied ${args.edits.length} hashline edit(s) to ${args.filePath}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("hashline_edit.error", { filePath: args.filePath, error: message });
    return `Error: ${message}`;
  }
}
