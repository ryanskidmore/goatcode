import { getSessionState } from "../../features/session-state/session-store"
import { log } from "../../shared/logger"
import type { PluginHookContributions } from "../../types/hook"

type EventHook = NonNullable<PluginHookContributions["event"]>

type TodoStatus = "pending" | "in_progress" | "completed" | "cancelled"

interface SessionTodo {
  content: string
  status: TodoStatus
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isTodoStatus(value: unknown): value is TodoStatus {
  return value === "pending" || value === "in_progress" || value === "completed" || value === "cancelled"
}

function extractPendingTodosFromState(sessionID: string): SessionTodo[] {
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

function resolveSessionID(input: unknown): string | undefined {
  if (!isRecord(input) || !isRecord(input.event)) {
    return undefined
  }

  const properties = isRecord(input.event.properties) ? input.event.properties : undefined
  const info = isRecord(properties?.info) ? properties.info : undefined
  const sessionID = properties?.sessionID
  const infoID = info?.id

  if (typeof sessionID === "string") {
    return sessionID
  }
  if (typeof infoID === "string") {
    return infoID
  }
  return undefined
}

function appendContinuationMessageToEvent(input: unknown, message: string): void {
  if (!isRecord(input) || !isRecord(input.event)) {
    return
  }

  const properties = isRecord(input.event.properties) ? input.event.properties : {}
  properties.continuationMessage = message
  input.event.properties = properties
}

export function createTodoEnforcerHandler(): EventHook {
  return async (input: unknown, ..._rest: unknown[]) => {
    if (!isRecord(input) || !isRecord(input.event) || input.event.type !== "session.idle") {
      return
    }

    const sessionID = resolveSessionID(input)
    if (!sessionID) {
      return
    }

    const pendingTodos = extractPendingTodosFromState(sessionID)
    if (pendingTodos.length === 0) {
      return
    }

    const nextTodo = pendingTodos[0]
    const continuationMessage = `[todo-enforcer] Session is idle but todos remain. Continue with next todo: ${nextTodo.content}`
    appendContinuationMessageToEvent(input, continuationMessage)

    log("[todo-enforcer] Injected continuation message on idle", {
      sessionID,
      pendingCount: pendingTodos.length,
      nextTodo: nextTodo.content,
    })
  }
}
