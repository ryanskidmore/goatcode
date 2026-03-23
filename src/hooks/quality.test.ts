import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

import { createCommentCheckerHandler, EMPTY_CATCH_WARNING } from "./comment-checker/handler"
import { createWriteFileGuardHandler, BLOCK_MESSAGE } from "./write-file-guard/handler"
import { createThinkingBlockValidatorHandler } from "./thinking-block-validator/handler"

describe("createCommentCheckerHandler", () => {
  describe("#given a write tool call with an empty catch block", () => {
    describe("#when the handler runs", () => {
      it("#then injects a warning into output.output", async () => {
        const handler = createCommentCheckerHandler()
        const input = { tool: "write", sessionID: "ses_1", callID: "call_1" }
        const output: Record<string, unknown> = {
          content: `
function foo() {
  try {
    doSomething()
  } catch (e) {}
}
`,
        }

        await handler(input, output)

        expect(typeof output.output).toBe("string")
        expect(output.output as string).toContain(EMPTY_CATCH_WARNING)
      })
    })
  })

  describe("#given a write tool call with a commented catch block", () => {
    describe("#when the handler runs", () => {
      it("#then does not inject a warning", async () => {
        const handler = createCommentCheckerHandler()
        const input = { tool: "write", sessionID: "ses_1", callID: "call_1" }
        const output: Record<string, unknown> = {
          content: `
function foo() {
  try {
    doSomething()
  } catch (e) {
    // ignore: expected on first run
  }
}
`,
        }

        await handler(input, output)

        expect(output.output).toBeUndefined()
      })
    })
  })

  describe("#given a non-write/edit tool call", () => {
    describe("#when the handler runs", () => {
      it("#then does nothing", async () => {
        const handler = createCommentCheckerHandler()
        const input = { tool: "bash", sessionID: "ses_1", callID: "call_1" }
        const output: Record<string, unknown> = {
          content: "try {} catch (e) {}",
        }

        await handler(input, output)

        expect(output.output).toBeUndefined()
      })
    })
  })

  describe("#given an edit tool call with empty catch in newString", () => {
    describe("#when the handler runs", () => {
      it("#then injects a warning", async () => {
        const handler = createCommentCheckerHandler()
        const input = { tool: "edit", sessionID: "ses_1", callID: "call_1" }
        const output: Record<string, unknown> = {
          newString: "try { doThing() } catch (err) {}",
        }

        await handler(input, output)

        expect(output.output as string).toContain(EMPTY_CATCH_WARNING)
      })
    })
  })
})

describe("createWriteFileGuardHandler", () => {
  let tempDir: string

  const createFile = (relativePath: string, content = "existing"): string => {
    const abs = join(tempDir, relativePath)
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, content)
    return abs
  }

  const invokePreToolUse = async (
    handler: ReturnType<typeof createWriteFileGuardHandler>,
    opts: {
      tool: string
      sessionID?: string
      filePath: string
    },
  ): Promise<void> => {
    const input = {
      tool: opts.tool,
      sessionID: opts.sessionID ?? "ses_default",
      callID: "call_1",
    }
    const output = { args: { filePath: opts.filePath } }
    await handler.preToolUse(input, output)
  }

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "write-file-guard-test-"))
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  describe("#given an existing file with no prior read", () => {
    describe("#when write is attempted", () => {
      it("#then throws block error", async () => {
        const handler = createWriteFileGuardHandler(tempDir)
        const existingFile = createFile("existing.txt")

        await expect(
          invokePreToolUse(handler, { tool: "write", filePath: existingFile }),
        ).rejects.toThrow(BLOCK_MESSAGE)
      })
    })
  })

  describe("#given an existing file that was read first in the same session", () => {
    describe("#when write is attempted", () => {
      it("#then allows the write", async () => {
        const handler = createWriteFileGuardHandler(tempDir)
        const existingFile = createFile("readable.txt")
        const sessionID = "ses_read_first"

        await invokePreToolUse(handler, { tool: "read", sessionID, filePath: existingFile })

        await expect(
          invokePreToolUse(handler, { tool: "write", sessionID, filePath: existingFile }),
        ).resolves.toBeUndefined()
      })
    })
  })

  describe("#given a non-existing file", () => {
    describe("#when write is attempted", () => {
      it("#then allows the write", async () => {
        const handler = createWriteFileGuardHandler(tempDir)
        const newFile = join(tempDir, "new-file.txt")

        await expect(
          invokePreToolUse(handler, { tool: "write", filePath: newFile }),
        ).resolves.toBeUndefined()
      })
    })
  })

  describe("#given a read in a different session", () => {
    describe("#when write is attempted from another session", () => {
      it("#then blocks the write", async () => {
        const handler = createWriteFileGuardHandler(tempDir)
        const existingFile = createFile("cross-session.txt")

        await invokePreToolUse(handler, {
          tool: "read",
          sessionID: "ses_reader",
          filePath: existingFile,
        })

        await expect(
          invokePreToolUse(handler, {
            tool: "write",
            sessionID: "ses_writer",
            filePath: existingFile,
          }),
        ).rejects.toThrow(BLOCK_MESSAGE)
      })
    })
  })

  describe("#given a session that was deleted after reading", () => {
    describe("#when write is attempted after session deletion", () => {
      it("#then blocks the write", async () => {
        const handler = createWriteFileGuardHandler(tempDir)
        const existingFile = createFile("cleanup.txt")
        const sessionID = "ses_cleanup"

        await invokePreToolUse(handler, { tool: "read", sessionID, filePath: existingFile })

        await handler.event({
          event: { type: "session.deleted", properties: { info: { id: sessionID } } },
        })

        await expect(
          invokePreToolUse(handler, { tool: "write", sessionID, filePath: existingFile }),
        ).rejects.toThrow(BLOCK_MESSAGE)
      })
    })
  })
})

describe("createThinkingBlockValidatorHandler", () => {
  describe("#given messages with a malformed thinking block (empty thinking)", () => {
    describe("#when the handler runs", () => {
      it("#then strips the malformed thinking block", async () => {
        const handler = createThinkingBlockValidatorHandler()
        const messages = [
          {
            info: { role: "assistant", id: "msg_1" },
            parts: [
              { type: "thinking", thinking: "" },
              { type: "text", text: "Hello" },
            ],
          },
        ]
        const output = { messages }

        await handler({}, output)

        expect(messages[0].parts).toHaveLength(1)
        expect(messages[0].parts[0].type).toBe("text")
      })
    })
  })

  describe("#given messages with a well-formed thinking block", () => {
    describe("#when the handler runs", () => {
      it("#then keeps the thinking block intact", async () => {
        const handler = createThinkingBlockValidatorHandler()
        const messages = [
          {
            info: { role: "assistant", id: "msg_1" },
            parts: [
              { type: "thinking", thinking: "I need to think about this carefully." },
              { type: "text", text: "Here is my answer." },
            ],
          },
        ]
        const output = { messages }

        await handler({}, output)

        expect(messages[0].parts).toHaveLength(2)
        expect(messages[0].parts[0].type).toBe("thinking")
      })
    })
  })

  describe("#given messages with a whitespace-only thinking block", () => {
    describe("#when the handler runs", () => {
      it("#then strips the whitespace-only thinking block", async () => {
        const handler = createThinkingBlockValidatorHandler()
        const messages = [
          {
            info: { role: "assistant", id: "msg_1" },
            parts: [
              { type: "thinking", thinking: "   \n  " },
              { type: "text", text: "Response" },
            ],
          },
        ]
        const output = { messages }

        await handler({}, output)

        expect(messages[0].parts).toHaveLength(1)
        expect(messages[0].parts[0].type).toBe("text")
      })
    })
  })

  describe("#given messages with no thinking blocks", () => {
    describe("#when the handler runs", () => {
      it("#then leaves messages unchanged", async () => {
        const handler = createThinkingBlockValidatorHandler()
        const messages = [
          {
            info: { role: "assistant", id: "msg_1" },
            parts: [{ type: "text", text: "Just text." }],
          },
        ]
        const output = { messages }

        await handler({}, output)

        expect(messages[0].parts).toHaveLength(1)
      })
    })
  })

  describe("#given user messages with malformed thinking blocks", () => {
    describe("#when the handler runs", () => {
      it("#then does not strip from user messages", async () => {
        const handler = createThinkingBlockValidatorHandler()
        const messages = [
          {
            info: { role: "user", id: "msg_1" },
            parts: [{ type: "thinking", thinking: "" }],
          },
        ]
        const output = { messages }

        await handler({}, output)

        expect(messages[0].parts).toHaveLength(1)
      })
    })
  })

  describe("#given empty output", () => {
    describe("#when the handler runs", () => {
      it("#then does not throw", async () => {
        const handler = createThinkingBlockValidatorHandler()

        await expect(handler({}, {})).resolves.toBeUndefined()
        await expect(handler({}, { messages: [] })).resolves.toBeUndefined()
      })
    })
  })
})
