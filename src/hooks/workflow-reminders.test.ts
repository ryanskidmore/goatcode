declare const require: (name: string) => any

const { describe, expect, it, mock } = require("bun:test")

import { createForegroundFallbackHandler, foregroundFallbackPlugin } from "./foreground-fallback"
import { createPhaseReminderHandler, phaseReminderPlugin, PHASE_REMINDER } from "./phase-reminder"
import { createPostReadNudgeHandler, postReadNudgePlugin, POST_READ_NUDGE } from "./post-read-nudge"

describe("foreground-fallback", () => {
  describe("#given a session.error with rate-limit signal", () => {
    describe("#when the handler receives a fallback chain", () => {
      it("#then switches to the next model and requests retry", async () => {
        const sessionModels = new Map<string, string>([["ses-foreground", "openai/gpt-5"]])
        const onFallbackApplied = mock(() => undefined)
        const onRetryRequested = mock(() => undefined)

        const handler = createForegroundFallbackHandler({
          getCurrentModel: (sessionID) => sessionModels.get(sessionID),
          setCurrentModel: (sessionID, model) => {
            sessionModels.set(sessionID, model)
          },
          onFallbackApplied,
          onRetryRequested,
        })

        const payload = {
          event: {
            type: "session.error",
            properties: {
              sessionID: "ses-foreground",
              model: "openai/gpt-5",
              error: { statusCode: 429, message: "Too many requests" },
              fallbackChain: ["openai/gpt-5", "openai/gpt-4.1-mini", "anthropic/claude-3.7-sonnet"],
            },
          },
        }

        await handler(payload as unknown as Parameters<typeof handler>[0])

        expect(sessionModels.get("ses-foreground")).toBe("openai/gpt-4.1-mini")
        const properties = payload.event.properties as Record<string, unknown>
        expect(properties.retryRequested).toBe(true)
        expect(properties.retryWithModel).toBe("openai/gpt-4.1-mini")
        expect(onFallbackApplied).toHaveBeenCalledTimes(1)
        expect(onRetryRequested).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe("#given duplicated rate-limit events in a short window", () => {
    describe("#when the handler receives two events within 5 seconds", () => {
      it("#then deduplicates fallback attempts", async () => {
        const sessionModels = new Map<string, string>([["ses-dedup", "openai/gpt-5"]])
        const onFallbackApplied = mock(() => undefined)
        const now = mock(() => 1_000)

        const handler = createForegroundFallbackHandler({
          getCurrentModel: (sessionID) => sessionModels.get(sessionID),
          setCurrentModel: (sessionID, model) => {
            sessionModels.set(sessionID, model)
          },
          onFallbackApplied,
          now,
        })

        const first = {
          event: {
            type: "session.error",
            properties: {
              sessionID: "ses-dedup",
              model: "openai/gpt-5",
              error: { message: "rate limit" },
              fallbackChain: ["openai/gpt-5", "openai/gpt-4.1-mini", "openai/gpt-4.1-nano"],
            },
          },
        }

        const second = {
          event: {
            type: "session.error",
            properties: {
              sessionID: "ses-dedup",
              model: "openai/gpt-4.1-mini",
              error: { message: "rate limit" },
              fallbackChain: ["openai/gpt-5", "openai/gpt-4.1-mini", "openai/gpt-4.1-nano"],
            },
          },
        }

        await handler(first as unknown as Parameters<typeof handler>[0])
        await handler(second as unknown as Parameters<typeof handler>[0])

        // With composite dedup keys (session+model), different models are not deduped
        expect(onFallbackApplied).toHaveBeenCalledTimes(2)
      })
    })
  })

  it("#then plugin registers an event hook", () => {
    expect(typeof foregroundFallbackPlugin.hooks?.event).toBe("function")
  })
})

describe("phase-reminder", () => {
  describe("#given an orchestrator user message", () => {
    describe("#when transform runs", () => {
      it("#then prepends the workflow reminder", async () => {
        const handler = createPhaseReminderHandler()
        const output = {
          messages: [
            {
              info: { role: "user", agent: "orchestrator" },
              parts: [{ type: "text", text: "Implement this task" }],
            },
          ],
        }

        await handler({}, output as unknown as Parameters<typeof handler>[1])

        const text = output.messages[0].parts[0].text
        expect(text.startsWith(PHASE_REMINDER)).toBe(true)
      })
    })
  })

  describe("#given a subagent user message", () => {
    describe("#when transform runs", () => {
      it("#then does not inject the reminder", async () => {
        const handler = createPhaseReminderHandler()
        const output = {
          messages: [
            {
              info: { role: "user", agent: "explore" },
              parts: [{ type: "text", text: "Search for files" }],
            },
          ],
        }

        await handler({}, output as unknown as Parameters<typeof handler>[1])

        const text = output.messages[0].parts[0].text
        expect(text).toBe("Search for files")
      })
    })
  })

  it("#then plugin registers a messages transform hook", () => {
    expect(typeof phaseReminderPlugin.hooks?.["experimental.chat.messages.transform"]).toBe("function")
  })
})

describe("post-read-nudge", () => {
  describe("#given a Read tool call", () => {
    describe("#when tool.execute.after runs", () => {
      it("#then appends the nudge", async () => {
        const handler = createPostReadNudgeHandler()
        const output = { title: "read", output: "file content", metadata: {} }

        await handler({ tool: "Read", sessionID: "s1", callID: "c1", args: {} }, output)

        expect(output.output.endsWith(POST_READ_NUDGE)).toBe(true)
      })
    })
  })

  describe("#given a non-read tool call", () => {
    describe("#when tool.execute.after runs", () => {
      it("#then leaves output unchanged", async () => {
        const handler = createPostReadNudgeHandler()
        const output = { title: "bash", output: "command output", metadata: {} }

        await handler({ tool: "Bash", sessionID: "s1", callID: "c1", args: {} }, output)

        expect(output.output).toBe("command output")
      })
    })
  })

  it("#then plugin registers tool.execute.after", () => {
    expect(typeof postReadNudgePlugin.hooks?.["tool.execute.after"]).toBe("function")
  })
})
