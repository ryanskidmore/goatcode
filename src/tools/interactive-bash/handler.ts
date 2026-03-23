import type { ToolDefinition } from "@opencode-ai/plugin"
import { log } from "../../shared/logger"
import { buildTool } from "../tool-builder"
import type { InteractiveBashArgs } from "./types"
import { interactiveBashArgsSchema } from "./types"

const TOOL_DESCRIPTION = `WARNING: This is TMUX ONLY. Pass tmux subcommands directly (without 'tmux' prefix).

Examples: new-session -d -s omo-dev, send-keys -t omo-dev "vim" Enter

For TUI apps needing ongoing interaction (vim, htop, pudb). One-shot commands -> use Bash with &.`

const TIMEOUT_MS = 30_000

function tokenizeCommand(cmd: string): string[] {
  const tokens: string[] = []
  let current = ""
  let inQuote = false
  let quoteChar = ""
  let escaped = false

  for (let i = 0; i < cmd.length; i++) {
    const char = cmd[i]

    if (escaped) {
      current += char
      escaped = false
      continue
    }

    if (char === "\\") {
      escaped = true
      continue
    }

    if ((char === "'" || char === '"') && !inQuote) {
      inQuote = true
      quoteChar = char
    } else if (char === quoteChar && inQuote) {
      inQuote = false
      quoteChar = ""
    } else if (char === " " && !inQuote) {
      if (current) {
        tokens.push(current)
        current = ""
      }
    } else {
      current += char
    }
  }

  if (current) tokens.push(current)
  return tokens
}

async function spawnTmux(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(["tmux", ...args], {
    stdout: "pipe",
    stderr: "pipe",
  })

  const timeoutPromise = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      const timeoutError = new Error(`Timeout after ${TIMEOUT_MS}ms`)
      try {
        proc.kill()
        void proc.exited.catch(() => {})
      } catch {
        // intentionally empty: kill errors are non-fatal
      }
      reject(timeoutError)
    }, TIMEOUT_MS)
    proc.exited
      .then(() => clearTimeout(id))
      .catch(() => clearTimeout(id))
  })

  const [stdout, stderr, exitCode] = await Promise.race([
    Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]),
    timeoutPromise,
  ])

  return { stdout, stderr, exitCode }
}

export const interactiveBashTool: ToolDefinition = buildTool({
  description: TOOL_DESCRIPTION,
  args: interactiveBashArgsSchema.shape as unknown as ToolDefinition["args"],
  execute: async (rawArgs) => {
    const args = interactiveBashArgsSchema.parse(rawArgs) as InteractiveBashArgs
    try {
      const parts = tokenizeCommand(args.tmux_command)

      if (parts.length === 0) {
        return "Error: Empty tmux command"
      }

      const { stdout, stderr, exitCode } = await spawnTmux(parts)

      if (exitCode !== 0) {
        const errorMsg = stderr.trim() || `Command failed with exit code ${exitCode}`
        log("[interactive_bash] tmux command failed", { exitCode, error: errorMsg })
        return `Error: ${errorMsg}`
      }

      return stdout || "(no output)"
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      if (message.includes("No such file") || message.includes("ENOENT") || message.includes("not found")) {
        log("[interactive_bash] tmux not found", { error: message })
        return "Error: tmux is not installed or not found in PATH. Install tmux to use this tool."
      }
      log("[interactive_bash] execution failed", { error: message })
      return `Error: ${message}`
    }
  },
})
