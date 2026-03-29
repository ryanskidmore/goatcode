import { describe, expect, it } from "bun:test"

import {
  createDelegateRetryHandler,
  detectDelegateTaskError,
  buildRetryGuidance,
} from "./delegate-retry/handler"
import { createEmptyResponseDetectorHandler, EMPTY_RESPONSE_WARNING } from "./empty-response-detector/handler"
import { createTaskResumeInfoHandler } from "./task-resume-info/handler"
import { createTodowriteDisablerHandler, SUBAGENT_TODOWRITE_BLOCK_MESSAGE } from "./todowrite-disabler/handler"

describe("delegate-retry", () => {
  describe("#given a task tool output with a delegate error", () => {
    describe("#when the output contains [ERROR] and a known pattern", () => {
      it("#then injects retry guidance into the output", async () => {
        const handler = createDelegateRetryHandler()
        const input = { tool: "task", sessionID: "s1", callID: "c1", args: {} }
        const output = {
          title: "task",
          output: "[ERROR] Invalid arguments: Must provide either category or subagent_type",
          metadata: {},
        }

        await handler(input, output)

        expect(output.output).toContain("[task CALL FAILED - IMMEDIATE RETRY REQUIRED]")
        expect(output.output).toContain("missing_category_or_agent")
      })
    })
  })

  describe("#given a task tool output without an error", () => {
    describe("#when the output is a normal success response", () => {
      it("#then does not modify the output", async () => {
        const handler = createDelegateRetryHandler()
        const input = { tool: "task", sessionID: "s1", callID: "c1", args: {} }
        const original = "Task completed successfully."
        const output = { title: "task", output: original, metadata: {} }

        await handler(input, output)

        expect(output.output).toBe(original)
      })
    })
  })

  describe("#given a non-task tool", () => {
    describe("#when the tool is Read", () => {
      it("#then does not modify the output", async () => {
        const handler = createDelegateRetryHandler()
        const input = { tool: "Read", sessionID: "s1", callID: "c1", args: {} }
        const original = "[ERROR] Invalid arguments: Must provide either category or subagent_type"
        const output = { title: "Read", output: original, metadata: {} }

        await handler(input, output)

        expect(output.output).toBe(original)
      })
    })
  })

  describe("#given detectDelegateTaskError", () => {
    describe("#when output has [ERROR] with run_in_background pattern", () => {
      it("#then returns the correct error type", () => {
        const result = detectDelegateTaskError("[ERROR] Invalid arguments: run_in_background is required")
        expect(result).not.toBeNull()
        expect(result?.errorType).toBe("missing_run_in_background")
      })
    })

    describe("#when output has no error markers", () => {
      it("#then returns null", () => {
        const result = detectDelegateTaskError("Task completed successfully.")
        expect(result).toBeNull()
      })
    })
  })

  describe("#given buildRetryGuidance", () => {
    describe("#when called with a known error type", () => {
      it("#then returns guidance with fix hint", () => {
        const guidance = buildRetryGuidance({
          errorType: "unknown_category",
          originalOutput: "[ERROR] Unknown category: foo. Available categories: general, quick",
        })
        expect(guidance).toContain("unknown_category")
        expect(guidance).toContain("Use a valid category")
      })
    })

    describe("#when called with an unknown error type", () => {
      it("#then returns a generic fallback message", () => {
        const guidance = buildRetryGuidance({
          errorType: "nonexistent_type",
          originalOutput: "[ERROR] something",
        })
        expect(guidance).toContain("[task ERROR]")
      })
    })
  })
})

describe("empty-response-detector", () => {
  describe("#given a task tool with empty output", () => {
    describe("#when the output string is empty", () => {
      it("#then replaces output with the warning message", async () => {
        const handler = createEmptyResponseDetectorHandler()
        const input = { tool: "task", sessionID: "s1", callID: "c1", args: {} }
        const output = { title: "task", output: "", metadata: {} }

        await handler(input, output)

        expect(output.output).toBe(EMPTY_RESPONSE_WARNING)
      })
    })
  })

  describe("#given a task tool with whitespace-only output", () => {
    describe("#when the output is only spaces", () => {
      it("#then replaces output with the warning message", async () => {
        const handler = createEmptyResponseDetectorHandler()
        const input = { tool: "task", sessionID: "s1", callID: "c1", args: {} }
        const output = { title: "task", output: "   ", metadata: {} }

        await handler(input, output)

        expect(output.output).toBe(EMPTY_RESPONSE_WARNING)
      })
    })
  })

  describe("#given a task tool with a normal response", () => {
    describe("#when the output has meaningful content", () => {
      it("#then does not modify the output", async () => {
        const handler = createEmptyResponseDetectorHandler()
        const input = { tool: "task", sessionID: "s1", callID: "c1", args: {} }
        const original = "Task completed. All files updated successfully."
        const output = { title: "task", output: original, metadata: {} }

        await handler(input, output)

        expect(output.output).toBe(original)
      })
    })
  })

  describe("#given a non-task tool", () => {
    describe("#when the tool is Bash with empty output", () => {
      it("#then does not modify the output", async () => {
        const handler = createEmptyResponseDetectorHandler()
        const input = { tool: "Bash", sessionID: "s1", callID: "c1", args: {} }
        const output = { title: "Bash", output: "", metadata: {} }

        await handler(input, output)

        expect(output.output).toBe("")
      })
    })
  })
})

describe("task-resume-info", () => {
  describe("#given a task tool output containing a session ID", () => {
    describe("#when the output has Session ID: ses_xxx", () => {
      it("#then appends a continuation hint", async () => {
        const handler = createTaskResumeInfoHandler()
        const input = { tool: "task", sessionID: "s1", callID: "c1", args: {} }
        const output = {
          title: "task",
          output: "Task completed.\nSession ID: ses_abc123",
          metadata: {},
        }

        await handler(input, output)

        expect(output.output).toContain("to continue:")
        expect(output.output).toContain("ses_abc123")
      })
    })
  })

  describe("#given a task tool output without a session ID", () => {
    describe("#when the output has no session ID pattern", () => {
      it("#then does not modify the output", async () => {
        const handler = createTaskResumeInfoHandler()
        const input = { tool: "task", sessionID: "s1", callID: "c1", args: {} }
        const original = "Task completed with no session info."
        const output = { title: "task", output: original, metadata: {} }

        await handler(input, output)

        expect(output.output).toBe(original)
      })
    })
  })

  describe("#given a task tool output that already has continuation info", () => {
    describe("#when the output already contains 'to continue:'", () => {
      it("#then does not add a duplicate", async () => {
        const handler = createTaskResumeInfoHandler()
        const input = { tool: "task", sessionID: "s1", callID: "c1", args: {} }
        const output = {
          title: "task",
          output: 'Done.\nSession ID: ses_abc123\nto continue: task(session_id="ses_abc123", prompt="...")',
          metadata: {},
        }

        await handler(input, output)

        const matches = output.output.match(/to continue:/g)
        expect(matches?.length).toBe(1)
      })
    })
  })

  describe("#given a task tool output starting with Error:", () => {
    describe("#when the output is an error response", () => {
      it("#then does not modify the output", async () => {
        const handler = createTaskResumeInfoHandler()
        const input = { tool: "task", sessionID: "s1", callID: "c1", args: {} }
        const original = "Error: something went wrong"
        const output = { title: "task", output: original, metadata: {} }

        await handler(input, output)

        expect(output.output).toBe(original)
      })
    })
  })

  describe("#given a non-target tool", () => {
    describe("#when the tool is Read", () => {
      it("#then does not modify the output", async () => {
        const handler = createTaskResumeInfoHandler()
        const input = { tool: "Read", sessionID: "s1", callID: "c1", args: {} }
        const original = "Session ID: ses_abc123"
        const output = { title: "Read", output: original, metadata: {} }

        await handler(input, output)

        expect(output.output).toBe(original)
      })
    })
  })
})

describe("todowrite-disabler", () => {
  describe("#given a subagent context (agent is 'explore')", () => {
    describe("#when TodoWrite is called", () => {
      it("#then throws with the block message", async () => {
        const handler = createTodowriteDisablerHandler("explore")
        const input = { tool: "TodoWrite", sessionID: "s1", callID: "c1" }
        const output = { args: {} }

        await expect(handler(input, output)).rejects.toThrow(SUBAGENT_TODOWRITE_BLOCK_MESSAGE)
      })
    })

    describe("#when TodoRead is called", () => {
      it("#then throws with the block message", async () => {
        const handler = createTodowriteDisablerHandler("oracle")
        const input = { tool: "TodoRead", sessionID: "s1", callID: "c1" }
        const output = { args: {} }

        await expect(handler(input, output)).rejects.toThrow(SUBAGENT_TODOWRITE_BLOCK_MESSAGE)
      })
    })

    describe("#when a non-todo tool is called", () => {
      it("#then does not throw", async () => {
        const handler = createTodowriteDisablerHandler("explore")
        const input = { tool: "Read", sessionID: "s1", callID: "c1" }
        const output = { args: {} }

        await expect(handler(input, output)).resolves.toBeUndefined()
      })
    })
  })

  describe("#given an orchestrator context (agent is 'orchestrator')", () => {
    describe("#when TodoWrite is called", () => {
      it("#then does not throw", async () => {
        const handler = createTodowriteDisablerHandler("orchestrator")
        const input = { tool: "TodoWrite", sessionID: "s1", callID: "c1" }
        const output = { args: {} }

        await expect(handler(input, output)).resolves.toBeUndefined()
      })
    })
  })

  describe("#given an executor context (agent is 'executor')", () => {
    describe("#when TodoWrite is called", () => {
      it("#then throws because executor is now a subagent", async () => {
        const handler = createTodowriteDisablerHandler("executor")
        const input = { tool: "TodoWrite", sessionID: "s1", callID: "c1" }
        const output = { args: {} }

        await expect(handler(input, output)).rejects.toThrow(SUBAGENT_TODOWRITE_BLOCK_MESSAGE)
      })
    })
  })

  describe("#given no agent name (undefined)", () => {
    describe("#when TodoWrite is called", () => {
      it("#then does not throw (no agent context means not a subagent)", async () => {
        const handler = createTodowriteDisablerHandler(undefined)
        const input = { tool: "TodoWrite", sessionID: "s1", callID: "c1" }
        const output = { args: {} }

        await expect(handler(input, output)).resolves.toBeUndefined()
      })
    })
  })
})
