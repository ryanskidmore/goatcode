import type { PluginHookContributions } from "../../types/hook"
import { log } from "../../shared/logger"
import { writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const MAX_BYTES = 51_200
const MAX_LINES = 2_000

const TRUNCATABLE_TOOLS = new Set([
  "grep",
  "Grep",
  "safe_grep",
  "glob",
  "Glob",
  "safe_glob",
  "lsp_diagnostics",
  "ast_grep_search",
  "interactive_bash",
  "Interactive_bash",
  "skill_mcp",
  "webfetch",
  "WebFetch",
  "bash",
  "Bash",
])

type PostToolUseHook = NonNullable<PluginHookContributions["tool.execute.after"]>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function writeTruncatedOutput(content: string, tool: string): string {
  const filename = `ochead-truncated-${tool}-${Date.now()}.txt`
  const filePath = join(tmpdir(), filename)
  try {
    writeFileSync(filePath, content)
    return filePath
  } catch {
    log("[tool-output-truncator] failed to write truncated output file", { filePath })
    return filePath
  }
}

function truncateOutput(output: string, tool: string): string {
  const lines = output.split("\n")
  const byteLength = Buffer.byteLength(output, "utf8")

  if (byteLength <= MAX_BYTES && lines.length <= MAX_LINES) {
    return output
  }

  const filePath = writeTruncatedOutput(output, tool)

  const kept = lines.slice(0, MAX_LINES)
  const truncatedBytes = Buffer.byteLength(kept.join("\n"), "utf8")
  const finalLines = truncatedBytes > MAX_BYTES
    ? lines.slice(0, Math.floor(MAX_LINES * (MAX_BYTES / truncatedBytes)))
    : kept

  const notice = `\n[Output truncated: ${lines.length} lines / ${byteLength} bytes exceeded limit. Full output written to ${filePath}. Use Read with offset/limit to access specific sections.]`
  return finalLines.join("\n") + notice
}

export function createToolOutputTruncatorHandler(): PostToolUseHook {
  return async (input: unknown, output: unknown) => {
    if (!isRecord(input) || !isRecord(output)) return

    const tool = input.tool
    const toolOutput = output.output

    if (typeof tool !== "string" || !TRUNCATABLE_TOOLS.has(tool)) return
    if (typeof toolOutput !== "string") return

    const truncated = truncateOutput(toolOutput, tool)
    if (truncated !== toolOutput) {
      output.output = truncated
      log("[tool-output-truncator] truncated output", { tool, originalLength: toolOutput.length })
    }
  }
}
