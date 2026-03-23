import { tool } from "@opencode-ai/plugin/tool"
import type { ToolDefinition } from "@opencode-ai/plugin"

const HASH_CHARS = "ZPMQVRWSNKTXJBYH"

const HASH_PATTERN = new RegExp(`^[${HASH_CHARS}]{2}$`)
const HASHLINE_OLD_STRING_PATTERN = new RegExp(`^[0-9]+#[${HASH_CHARS}]{2}\\|.*$`)

const hashlineEditSchema = tool.schema.object({
  oldString: tool.schema
    .string()
    .regex(HASHLINE_OLD_STRING_PATTERN, 'oldString must use "LINE#ID|content" format'),
  newString: tool.schema.string().describe("Replacement text; supports embedded newlines"),
  hash: tool.schema.string().regex(HASH_PATTERN, "hash must be two hashline characters"),
})

export const hashlineEditArgsShape: ToolDefinition["args"] = {
  filePath: tool.schema.string().describe("Absolute path to the target file"),
  edits: tool.schema.array(hashlineEditSchema).describe("Edits anchored by LINE#ID hashes"),
}

export interface HashlineEdit {
  oldString: string
  newString: string
  hash: string
}
export type HashlineEditToolArgs = {
  filePath: string
  edits: HashlineEdit[]
}

export interface ParsedHashline {
  lineNumber: number
  hash: string
  content: string
}

export interface EditOperation {
  editIndex: number
  lineIndex: number
  newLines: string[]
}
