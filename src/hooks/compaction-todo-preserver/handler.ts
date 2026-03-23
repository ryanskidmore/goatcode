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

function extractTodos(sessionID: string): SessionTodo[] {
  const state = getSessionState(sessionID)
  if (!state) {
    return []
  }

  const todos = (state as unknown as { todos?: unknown }).todos
  if (!Array.isArray(todos)) {
    return []
  }

  return todos.filter((todo): todo is SessionTodo => {
    if (!isRecord(todo)) {
      return false
    }
    return typeof todo.content === "string" && isTodoStatus(todo.status)
  })
}

function isCompactionEvent(input: unknown): boolean {
  if (!isRecord(input)) {
    return false
  }

  if (typeof input.sessionID === "string") {
    return true
  }

  if (!isRecord(input.event)) {
    return false
  }

  return (
    input.event.type === "session.compacting"
    || input.event.type === "session.compacted"
    || input.event.type === "experimental.session.compacting"
  )
}

function resolveSessionID(input: unknown): string | undefined {
  if (!isRecord(input)) {
    return undefined
  }

  if (typeof input.sessionID === "string") {
    return input.sessionID
  }

  if (!isRecord(input.event)) {
    return undefined
  }

  const properties = isRecord(input.event.properties) ? input.event.properties : undefined
  const info = isRecord(properties?.info) ? properties.info : undefined
  const eventSessionID = properties?.sessionID
  const infoID = info?.id

  if (typeof eventSessionID === "string") {
    return eventSessionID
  }
  if (typeof infoID === "string") {
    return infoID
  }
  return undefined
}

function formatTodoSnapshot(todos: SessionTodo[]): string {
  const lines = todos.map((todo) => `- [${todo.status}] ${todo.content}`)
  return `[compaction-todo-preserver] Preserve current todos across compaction:\n${lines.join("\n")}`
}

function prependSnapshot(output: unknown, snapshot: string): void {
  if (!isRecord(output)) {
    return
  }

  if (Array.isArray(output.context)) {
    output.context.unshift(snapshot)
    return
  }

  output.compactionContextPrefix = snapshot
}

export function createCompactionTodoPreserverHandler(): EventHook {
  return async (input: unknown, ...rest: unknown[]) => {
    if (!isCompactionEvent(input)) {
      return
    }

    const sessionID = resolveSessionID(input)
    if (!sessionID) {
      return
    }

    const todos = extractTodos(sessionID)
    if (todos.length === 0) {
      return
    }

    const snapshot = formatTodoSnapshot(todos)
    const output = rest[0]
    prependSnapshot(output, snapshot)

    log("[compaction-todo-preserver] Prepended todo snapshot for compaction", {
      sessionID,
      todoCount: todos.length,
    })
  }
}
