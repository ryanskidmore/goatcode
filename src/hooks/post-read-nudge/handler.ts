import type { PluginHookContributions } from "../../types/hook"

type PostToolUseHook = NonNullable<PluginHookContributions["tool.execute.after"]>

export const POST_READ_NUDGE =
  "\n\n---\nWorkflow Reminder: delegate based on rules; if mentioning a specialist, launch it in this same turn."

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isReadTool(tool: string): boolean {
  return tool.toLowerCase() === "read"
}

export function createPostReadNudgeHandler(): PostToolUseHook {
  return async (input: unknown, output: unknown) => {
    if (!isRecord(input) || !isRecord(output)) return

    const tool = input.tool
    const text = output.output
    if (typeof tool !== "string" || typeof text !== "string") return
    if (!isReadTool(tool)) return
    if (text.includes(POST_READ_NUDGE.trim())) return

    output.output = `${text}${POST_READ_NUDGE}`
  }
}
