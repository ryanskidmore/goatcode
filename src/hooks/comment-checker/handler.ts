import type { PluginHookContributions } from "../../types/hook"
import { log } from "../../shared/logger"

type PreToolUseHook = NonNullable<PluginHookContributions["tool.execute.before"]>

const EMPTY_CATCH_PATTERN = /catch\s*\([^)]*\)\s*\{\s*\}/g
const EMPTY_CATCH_WITH_COMMENT_PATTERN = /catch\s*\([^)]*\)\s*\{\s*\/\//

const WARNING_MARKER = "[COMMENT-CHECKER WARNING]"

export const EMPTY_CATCH_WARNING =
  `${WARNING_MARKER}\nEmpty catch block detected with no comment explaining why the error is ignored. ` +
  `Add a comment inside the catch block explaining the intent, e.g. // ignore: expected when X.`

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function extractContent(output: Record<string, unknown>): string | undefined {
  const content = output.content ?? output.newString ?? output.new_string
  return typeof content === "string" ? content : undefined
}

function hasEmptyCatchBlock(code: string): boolean {
  const matches = code.match(EMPTY_CATCH_PATTERN)
  if (!matches || matches.length === 0) {
    return false
  }
  return !EMPTY_CATCH_WITH_COMMENT_PATTERN.test(code)
}

export function createCommentCheckerHandler(): PreToolUseHook {
  return async (input: unknown, output: unknown) => {
    if (!isRecord(input) || !isRecord(output)) {
      return
    }

    const tool = input.tool
    if (typeof tool !== "string") {
      return
    }

    const toolLower = tool.toLowerCase()
    if (toolLower !== "write" && toolLower !== "edit" && toolLower !== "multiedit") {
      return
    }

    const content = extractContent(output)
    if (!content) {
      return
    }

    if (!hasEmptyCatchBlock(content)) {
      return
    }

    log("[comment-checker] empty catch block detected", { tool: toolLower })

    const existingOutput = typeof output.output === "string" ? output.output : ""
    output.output = existingOutput
      ? `${existingOutput}\n${EMPTY_CATCH_WARNING}`
      : EMPTY_CATCH_WARNING
  }
}
