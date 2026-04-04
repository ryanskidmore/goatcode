import { readFile, writeFile } from "node:fs/promises";
import type { ToolDefinition } from "@opencode-ai/plugin";
import { log } from "../../shared/logger";
import { applyRawHashlineEdits, normalizeEdit } from "./edit-operations";
import type { HashlineEditToolArgs } from "./types";

type ToolContext = Parameters<ToolDefinition["execute"]>[1];

export async function executeHashlineEdit(
  args: HashlineEditToolArgs,
  _context: ToolContext,
): Promise<string> {
  log("hashline_edit.start", { filePath: args.filePath, editCount: args.edits.length });

  try {
    if (!args.edits || !Array.isArray(args.edits) || args.edits.length === 0) {
      return "Error: edits parameter must be a non-empty array";
    }

    // Pre-validate edit shapes before reading file
    for (let i = 0; i < args.edits.length; i++) {
      normalizeEdit(args.edits[i], i);
    }

    const canCreateFile = args.edits.every(
      (e) => e.op === "append_file" || e.op === "prepend_file",
    );

    let existing: string;
    try {
      existing = await readFile(args.filePath, "utf8");
    } catch {
      if (canCreateFile) {
        existing = "";
      } else {
        return `Error: File not found: ${args.filePath}`;
      }
    }

    const report = applyRawHashlineEdits(existing, args.edits);

    if (report.content === existing) {
      let diagnostic = `No changes made to ${args.filePath}. The edits produced identical content.`;
      if (report.noopEdits > 0) {
        diagnostic += ` No-op edits: ${report.noopEdits}. Re-read the file and provide content that differs from current lines.`;
      }
      return `Error: ${diagnostic}`;
    }

    await writeFile(args.filePath, report.content, "utf8");
    log("hashline_edit.success", { filePath: args.filePath, editCount: args.edits.length });

    let message = `Applied ${args.edits.length} hashline edit(s) to ${args.filePath}`;
    if (report.warnings.length > 0) {
      message += `\nWarnings:\n${report.warnings.map((w) => `  - ${w}`).join("\n")}`;
    }

    return message;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("hashline_edit.error", { filePath: args.filePath, error: message });
    if (message.includes("changed since last read")) {
      return `Error: hash mismatch - ${message}\nTip: reuse LINE#HASH entries from the latest read output, or batch related edits in one call.`;
    }
    return `Error: ${message}`;
  }
}
