import { describe, expect, it } from "bun:test"

import { createEventErrorHandler, createToolErrorHandler } from "./handler"
import { matchDiagnostic } from "./patterns"
import type { ErrorCategory } from "./types"

describe("error-diagnostics", () => {
  describe("matchDiagnostic", () => {
    it("matches each category", () => {
      const cases: Array<{ input: string; category: ErrorCategory }> = [
        { input: "Error 429: too many requests", category: "rate-limit" },
        { input: "authentication failed with invalid API key", category: "auth" },
        { input: "request ETIMEDOUT after 30000ms", category: "timeout" },
        { input: "EACCES: permission denied, open '/tmp/file'", category: "permission" },
        { input: "ENOENT: no such file or directory", category: "file-system" },
        { input: "fetch failed due to ECONNREFUSED", category: "network" },
        { input: "JavaScript heap out of memory", category: "memory" },
        { input: "SyntaxError: unexpected token ;", category: "syntax" },
        { input: "TypeError: value is not a function", category: "type-error" },
      ]

      for (const testCase of cases) {
        const result = matchDiagnostic(testCase.input)
        expect(result).not.toBeNull()
        expect(result?.category).toBe(testCase.category)
      }
    })

    it("returns null for unknown text", () => {
      const result = matchDiagnostic("all operations completed successfully")
      expect(result).toBeNull()
    })
  })

  describe("createToolErrorHandler", () => {
    it("injects diagnostic block into matched tool output", async () => {
      const handler = createToolErrorHandler() as (
        input: unknown,
        output: unknown,
      ) => Promise<void> | void
      const output = { output: "Request failed with 429 too many requests" }

      await handler({}, output)

      expect(output.output).toContain("[ERROR DIAGNOSTIC]")
      expect(output.output).toContain("Category: rate-limit")
      expect(output.output).toContain("Severity: warning")
      expect(output.output).toContain("Suggestion:")
    })

    it("skips non-error output", async () => {
      const handler = createToolErrorHandler() as (
        input: unknown,
        output: unknown,
      ) => Promise<void> | void
      const output = { output: "everything is healthy and complete" }

      await handler({}, output)

      expect(output.output).toBe("everything is healthy and complete")
    })

    it("skips output that already contains diagnostics", async () => {
      const handler = createToolErrorHandler() as (
        input: unknown,
        output: unknown,
      ) => Promise<void> | void
      const output = {
        output:
          "Error 429: too many requests\n[ERROR DIAGNOSTIC]\nCategory: rate-limit\nSeverity: warning\nSuggestion: wait",
      }

      await handler({}, output)

      const markerCount = (output.output.match(/\[ERROR DIAGNOSTIC\]/g) ?? []).length
      expect(markerCount).toBe(1)
    })
  })

  describe("createEventErrorHandler", () => {
    it("processes session.error and appends recoveryContext diagnostic", async () => {
      const handler = createEventErrorHandler() as (input: unknown) => Promise<void> | void
      const payload = {
        event: {
          type: "session.error",
          properties: {
            error: "Permission denied while accessing /tmp",
          },
        },
      }

      await handler(payload)

      const properties = payload.event.properties as { recoveryContext?: string }
      expect(properties.recoveryContext).toContain("[ERROR DIAGNOSTIC]")
      expect(properties.recoveryContext).toContain("Category: permission")
    })

    it("ignores non-session.error event types", async () => {
      const handler = createEventErrorHandler() as (input: unknown) => Promise<void> | void
      const payload = {
        event: {
          type: "session.idle",
          properties: {
            error: "Permission denied while accessing /tmp",
          },
        },
      }

      await handler(payload)

      const properties = payload.event.properties as { recoveryContext?: string }
      expect(properties.recoveryContext).toBeUndefined()
    })
  })
})
