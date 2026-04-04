import type { ToolDefinition } from "@opencode-ai/plugin";
import { definePlugin } from "../../plugin-api";
import { buildTool } from "../tool-builder";
import { executeHashlineEdit } from "./handler";
import { hashlineEditArgsShape, type HashlineEditToolArgs } from "./types";

const HASHLINE_EDIT_DESCRIPTION = `Edit files using LINE#HASH anchors for precise, safe modifications.

WORKFLOW:
1. Read target file and copy exact LINE#HASH tags from output.
2. Pick the smallest operation per logical change.
3. Submit one edit call per file with all related operations.
4. If same file needs another call, re-read first.

OPERATIONS:
  replace_line:  { op: "replace_line", pos: "LINE#HASH", lines: [...] }
    Replace a single line. pos identifies the line to replace.
  replace_range: { op: "replace_range", pos: "LINE#HASH", end: "LINE#HASH", lines: [...] }
    Replace lines pos..end (inclusive). Lines BEFORE pos and AFTER end are untouched.
  append_at:     { op: "append_at", pos: "LINE#HASH", lines: [...] }
    Insert lines after the anchor line.
  prepend_at:    { op: "prepend_at", pos: "LINE#HASH", lines: [...] }
    Insert lines before the anchor line.
  append_file:   { op: "append_file", lines: [...] }
    Append lines to end of file (creates file if missing).
  prepend_file:  { op: "prepend_file", lines: [...] }
    Prepend lines to start of file (creates file if missing).

LINE#HASH FORMAT:
  "{line_number}#{hash_id}" where hash_id is two chars from ZPMQVRWSNKTXJBYH.
  Example: "42#VK" means line 42 with hash VK.
  Tags MUST be copied exactly from read output. NEVER guess tags.

CONTENT FORMAT:
  lines can be a string (split by newlines), string[] (preferred), or null.
  lines: null or lines: [] with replace ops = delete those lines.

RULES:
  1. All edits in one call reference the ORIGINAL file state. Do NOT adjust line numbers
     for prior edits -- the system applies them bottom-up automatically.
  2. replace_range removes lines pos..end inclusive and inserts lines in their place.
     Do NOT include surrounding lines in lines -- they survive untouched.
  3. Minimize scope: one logical mutation per operation.
  4. No no-ops: replacement content must differ from current content.
  5. Batch = multiple operations in edits[], NOT one big replace covering everything.

EXAMPLES:
  Single-line replace: { op: "replace_line", pos: "11#XJ", lines: ["  console.log('hello');"] }
  Range replace:       { op: "replace_range", pos: "11#XJ", end: "13#MB", lines: ["  return 'hi';"] }
  Delete lines:        { op: "replace_range", pos: "5#VK", end: "8#NR", lines: null }
  Insert after:        { op: "append_at", pos: "13#QR", lines: ["", "function added() {", "}"] }
  Insert at EOF:       { op: "append_file", lines: ["// end of file"] }`;

export const hashlineEditTool: ToolDefinition = buildTool<
  typeof hashlineEditArgsShape,
  HashlineEditToolArgs
>({
  description: HASHLINE_EDIT_DESCRIPTION,
  args: hashlineEditArgsShape,
  execute: executeHashlineEdit,
});

export const hashlineEditPlugin = definePlugin({
  name: "hashline-edit",
  version: "0.2.0",
  tools: {
    hashline_edit: hashlineEditTool,
  },
});
