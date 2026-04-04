import { tool } from "@opencode-ai/plugin/tool";
import type { ToolDefinition } from "@opencode-ai/plugin";

export interface Anchor {
  line: number;
  hash: string;
}

export interface ReplaceLineEdit {
  op: "replace_line";
  pos: Anchor;
  lines: string[];
}

export interface ReplaceRangeEdit {
  op: "replace_range";
  pos: Anchor;
  end: Anchor;
  lines: string[];
}

export interface AppendAtEdit {
  op: "append_at";
  pos: Anchor;
  lines: string[];
}

export interface PrependAtEdit {
  op: "prepend_at";
  pos: Anchor;
  lines: string[];
}

export interface AppendFileEdit {
  op: "append_file";
  lines: string[];
}

export interface PrependFileEdit {
  op: "prepend_file";
  lines: string[];
}

export type HashlineEdit =
  | ReplaceLineEdit
  | ReplaceRangeEdit
  | AppendAtEdit
  | PrependAtEdit
  | AppendFileEdit
  | PrependFileEdit;

export interface RawHashlineEdit {
  op: string;
  pos?: string;
  end?: string;
  lines?: string | string[] | null;
}

export type HashlineEditToolArgs = {
  filePath: string;
  edits: RawHashlineEdit[];
};

export const hashlineEditArgsShape: ToolDefinition["args"] = {
  filePath: tool.schema.string().describe("Absolute path to the target file"),
  edits: tool.schema
    .array(
      tool.schema.object({
        op: tool.schema
          .union([
            tool.schema.literal("replace_line"),
            tool.schema.literal("replace_range"),
            tool.schema.literal("append_at"),
            tool.schema.literal("prepend_at"),
            tool.schema.literal("append_file"),
            tool.schema.literal("prepend_file"),
          ])
          .describe("Edit operation type"),
        pos: tool.schema.string().optional().describe("Primary anchor in LINE#HASH format"),
        end: tool.schema
          .string()
          .optional()
          .describe("Range end anchor in LINE#HASH format (replace_range only)"),
        lines: tool.schema
          .union([
            tool.schema.array(tool.schema.string()),
            tool.schema.string(),
            tool.schema.null(),
          ])
          .describe("Replacement lines. null or [] with replace ops = delete lines"),
      }),
    )
    .describe("Array of edit operations anchored by LINE#HASH references"),
};

export interface HashlineApplyReport {
  content: string;
  noopEdits: number;
  deduplicatedEdits: number;
  firstChangedLine: number | undefined;
  warnings: string[];
}
