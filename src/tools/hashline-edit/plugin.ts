import type { ToolDefinition } from "@opencode-ai/plugin"
import { definePlugin } from "../../plugin-api"
import { buildTool } from "../tool-builder"
import { executeHashlineEdit } from "./handler"
import { hashlineEditArgsShape, type HashlineEditToolArgs } from "./types"

const HASHLINE_EDIT_DESCRIPTION = `Edit file lines via hash-anchored LINE#ID references.

Each edit includes oldString in LINE#ID|content format plus a hash field. The tool recomputes
the current hash at the matched content location before applying replacements. If hashes differ,
it rejects the request with a stale content error to prevent corrupting updated files.`

export const hashlineEditTool: ToolDefinition = buildTool<typeof hashlineEditArgsShape, HashlineEditToolArgs>({
  description: HASHLINE_EDIT_DESCRIPTION,
  args: hashlineEditArgsShape,
  execute: executeHashlineEdit,
})

export const hashlineEditPlugin = definePlugin({
  name: "hashline-edit",
  version: "0.1.0",
  tools: {
    hashline_edit: hashlineEditTool,
  },
})
