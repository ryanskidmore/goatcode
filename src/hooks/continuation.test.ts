import { beforeEach, describe, expect, it } from "bun:test"
import {
  clearSessionStore,
  getSessionState,
  setSessionState,
} from "../features/session-state/session-store"
import { createCompactionTodoPreserverHandler } from "./compaction-todo-preserver/handler"
import { createStopGuardHandler } from "./stop-guard/handler"
import { createTodoEnforcerHandler } from "./todo-enforcer/handler"

type MutableTodoState = {
  todos?: Array<{
    content: string
    status: "pending" | "in_progress" | "completed" | "cancelled"
  }>
}

type GenericHook = (input: unknown, output?: unknown) => Promise<void>

function seedTodos(
  sessionID: string,
  todos: NonNullable<MutableTodoState["todos"]>,
): void {
  setSessionState(sessionID, { status: "active" })
  const state = getSessionState(sessionID) as unknown as MutableTodoState | undefined
  if (!state) {
    return
  }
  state.todos = todos
}

describe("continuation hooks", () => {
  beforeEach(() => {
    clearSessionStore()
  })

  describe("#given todo-enforcer", () => {
    describe("#when session.idle occurs with pending todos", () => {
      it("#then injects a continuation message for the next todo", async () => {
        const sessionID = "session-idle-with-todos"
        seedTodos(sessionID, [
          { content: "Implement hook wiring", status: "pending" },
          { content: "Run typecheck", status: "completed" },
        ])
        const handler = createTodoEnforcerHandler() as unknown as GenericHook
        const input = {
          event: {
            type: "session.idle",
            properties: { sessionID },
          },
        }

        await handler(input)

        const properties = input.event.properties as Record<string, unknown>
        expect(typeof properties.continuationMessage).toBe("string")
        expect(String(properties.continuationMessage)).toContain("Implement hook wiring")
      })
    })
  })

  describe("#given compaction-todo-preserver", () => {
    describe("#when compaction runs with todo state", () => {
      it("#then prepends todo snapshot to compacted context", async () => {
        const sessionID = "session-compaction"
        seedTodos(sessionID, [
          { content: "First pending task", status: "pending" },
          { content: "Current in-progress task", status: "in_progress" },
        ])
        const handler = createCompactionTodoPreserverHandler() as unknown as GenericHook
        const input = {
          event: {
            type: "session.compacted",
            properties: { sessionID },
          },
        }
        const output = { context: ["existing compacted context"] }

        await handler(input, output)

        expect(output.context[0]).toContain("compaction-todo-preserver")
        expect(output.context[0]).toContain("First pending task")
        expect(output.context[1]).toBe("existing compacted context")
      })
    })
  })

  describe("#given stop-guard", () => {
    describe("#when a stop-like message arrives while todos are pending", () => {
      it("#then injects a continue-working reminder", async () => {
        const sessionID = "session-stop-guard"
        seedTodos(sessionID, [
          { content: "Finish final verification", status: "pending" },
        ])
        const handler = createStopGuardHandler() as unknown as GenericHook
        const input = {
          sessionID,
          message: "I'm done.",
        } as Record<string, unknown>

        await handler(input)

        expect(typeof input.stopGuardMessage).toBe("string")
        expect(String(input.stopGuardMessage)).toContain("Finish final verification")
      })
    })
  })
})
