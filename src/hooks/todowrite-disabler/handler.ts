import type { PluginHookContributions } from "../../types/hook"
import { log } from "../../shared/logger"

type PreToolUseHook = NonNullable<PluginHookContributions["tool.execute.before"]>

export const BLOCKED_TOOLS = ["TodoWrite", "TodoRead"]

export const SUBAGENT_TODOWRITE_BLOCK_MESSAGE =
  `TodoWrite/TodoRead are DISABLED in subagent contexts.\n\n` +
  `Subagents must not manage the todo list directly. ` +
  `Only the main orchestrator manages todos.\n\n` +
  `If you need to track work, report your progress in your response text ` +
  `so the orchestrator can update todos accordingly.`

const ORCHESTRATOR_AGENTS = ["orchestrator", "executor"]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isSubagentContext(agentName: string | undefined): boolean {
  if (!agentName) return false
  return !ORCHESTRATOR_AGENTS.includes(agentName.toLowerCase())
}

export function createTodowriteDisablerHandler(agentName: string | undefined): PreToolUseHook {
  return async (input: unknown, _output: unknown) => {
    if (!isRecord(input)) {
      return
    }

    if (!isSubagentContext(agentName)) {
      return
    }

    const tool = input.tool
    if (typeof tool !== "string") {
      return
    }

    const isBlocked = BLOCKED_TOOLS.some(
      (blocked) => blocked.toLowerCase() === tool.toLowerCase(),
    )

    if (!isBlocked) {
      return
    }

    log("[todowrite-disabler] blocked TodoWrite in subagent context", { agentName, tool })
    throw new Error(SUBAGENT_TODOWRITE_BLOCK_MESSAGE)
  }
}
