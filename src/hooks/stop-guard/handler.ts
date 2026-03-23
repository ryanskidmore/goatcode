import { getSessionState } from "../../features/session-state/session-store"
import { log } from "../../shared/logger"
import type { PluginHookContributions } from "../../types/hook"

type ChatMessageHook = NonNullable<PluginHookContributions["chat.message"]>

type TodoStatus = "pending" | "in_progress" | "completed" | "cancelled"

interface SessionTodo {
  content: string
  status: TodoStatus
}

const STOP_PATTERNS = [
  /\bi['’]?m done\b/i,
  /\btask complete\b/i,
  /\btasks? complete\b/i,
  /\ball done\b/i,
  /\bwork is complete\b/i,
  /\bfinished\b/i,
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isTodoStatus(value: unknown): value is TodoStatus {
  return value === "pending" || value === "in_progress" || value === "completed" || value === "cancelled"
}

function resolveSessionID(input: unknown): string | undefined {
  if (!isRecord(input)) {
    return undefined
  }

  if (typeof input.sessionID === "string") {
    return input.sessionID
  }

  if (isRecord(input.message) && typeof input.message.sessionID === "string") {
    return input.message.sessionID
  }

  return undefined
}

function resolveMessageText(input: unknown): string {
  if (!isRecord(input)) {
    return ""
  }

  if (typeof input.message === "string") {
    return input.message
  }

  if (typeof input.content === "string") {
    return input.content
  }

  if (isRecord(input.message) && typeof input.message.content === "string") {
    return input.message.content
  }

  return ""
}

function extractPendingTodos(sessionID: string): SessionTodo[] {
  const state = getSessionState(sessionID)
  if (!state) {
    return []
  }

  const todos = (state as unknown as { todos?: unknown }).todos
  if (!Array.isArray(todos)) {
    return []
  }

  return todos
    .filter((todo): todo is SessionTodo => {
      if (!isRecord(todo)) {
        return false
      }
      return typeof todo.content === "string" && isTodoStatus(todo.status)
    })
    .filter((todo) => todo.status === "pending" || todo.status === "in_progress")
}

function isStopLikeMessage(message: string): boolean {
  return STOP_PATTERNS.some((pattern) => pattern.test(message))
}

function injectReminder(input: unknown, reminder: string): void {
  if (!isRecord(input)) {
    return
  }
  input.stopGuardMessage = reminder
}

export function createStopGuardHandler(): ChatMessageHook {
  return async (input: unknown, ..._rest: unknown[]) => {
    const sessionID = resolveSessionID(input)
    if (!sessionID) {
      return
    }

    const message = resolveMessageText(input)
    if (!isStopLikeMessage(message)) {
      return
    }

    const pendingTodos = extractPendingTodos(sessionID)
    if (pendingTodos.length === 0) {
      return
    }

    const reminder = `[stop-guard] Completion claim detected, but ${pendingTodos.length} todo item(s) are still pending. Continue with: ${pendingTodos[0]?.content}`
    injectReminder(input, reminder)

    log("[stop-guard] Blocked premature stop with pending todos", {
      sessionID,
      pendingCount: pendingTodos.length,
      message,
    })
  }
}
