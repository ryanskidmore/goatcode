import { describe, expect, it } from "bun:test"

import { createContextWindowLimitHandler } from "./context-window-limit"
import { createEditErrorHandler } from "./edit-error"
import { createJsonErrorHandler } from "./json-error"
import { createSessionRecoveryHandler } from "./session-recovery"

describe("error recovery hooks", () => {
  describe("#given edit-error hook", () => {
    describe("#when Edit tool returns oldString not found", () => {
      it("#then recovery guidance is appended", async () => {
        const handler = createEditErrorHandler()
        const input = { tool: "Edit" }
        const output = { output: "Edit failed: oldString not found in target file" }

        await handler(input, output)

        expect(output.output).toContain("[EDIT ERROR RECOVERY]")
      })
    })
  })

  describe("#given json-error hook", () => {
    describe("#when JSON parse failure text is returned", () => {
      it("#then JSON recovery guidance is appended", async () => {
        const handler = createJsonErrorHandler()
        const input = { tool: "task" }
        const output = { output: "JSON parse error: unexpected end of JSON input" }

        await handler(input, output)

        expect(output.output).toContain("[JSON ERROR RECOVERY]")
      })
    })
  })

  describe("#given session-recovery hook", () => {
    describe("#when session.error reports disconnect", () => {
      it("#then recovery context is injected into event properties", async () => {
        const handler = createSessionRecoveryHandler()
        const payload = {
          event: {
            type: "session.error",
            properties: {
              error: "session disconnect: socket hang up",
            },
          },
        }

        await handler(payload)

        const recoveryContext = (payload.event.properties as { recoveryContext?: string }).recoveryContext
        expect(recoveryContext).toContain("[SESSION RECOVERY]")
      })
    })
  })

  describe("#given context-window-limit hook", () => {
    describe("#when session.idle reports high context usage", () => {
      it("#then compact and summarize actions are injected", async () => {
        const handler = createContextWindowLimitHandler()
        const payload = {
          event: {
            type: "session.idle",
            properties: {
              contextWindowUsage: 0.95,
            },
          },
        }

        await handler(payload)

        const properties = payload.event.properties as {
          recoveryActions?: string[]
          recoveryContext?: string
        }

        expect(properties.recoveryActions).toContain("compact")
        expect(properties.recoveryActions).toContain("summarize")
        expect(properties.recoveryContext).toContain("[CONTEXT WINDOW LIMIT RECOVERY]")
      })
    })
  })
})
