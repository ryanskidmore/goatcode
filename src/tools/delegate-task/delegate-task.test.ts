import { describe, it, expect, mock } from "bun:test"
import { resolveCategory } from "./category-resolver"
import { DEFAULT_CATEGORIES, CATEGORY_NAMES } from "./constants"
import type { BackgroundTask } from "../../features/background-agent/types"
import { createTaskTool } from "./handler"
import type { ToolDefinition } from "@opencode-ai/plugin"

function makeMockManager() {
  const launched: Array<{ id: string; prompt: string; model: string }> = []
  return {
    launched,
    launch: mock(async (_ctx: unknown, input: { id: string; prompt: string; model: string }) => {
      launched.push(input)
      return {
        id: input.id,
        status: "queued" as BackgroundTask["status"],
        prompt: input.prompt,
        model: input.model,
        createdAt: Date.now(),
      }
    }),
    get: mock(() => undefined),
    getAll: mock(() => []),
    complete: mock(() => {}),
    fail: mock(() => {}),
    cancel: mock(async () => {}),
  }
}

function makeMockToolContext(overrides: Partial<Parameters<ToolDefinition["execute"]>[1]> = {}) {
  return {
    sessionID: "test-session",
    messageID: "test-message",
    agent: "test-agent",
    directory: "/tmp/test",
    worktree: "/tmp/test",
    abort: new AbortController().signal,
    metadata: () => {},
    ask: async () => {},
    client: makeMockClient(),
    ...overrides,
  } as unknown as Parameters<ToolDefinition["execute"]>[1]
}

function makeMockClient() {
  return {
    session: {
      create: mock(async () => ({
        data: { id: "sync-session-123" },
        error: undefined,
      })),
      promptAsync: mock(async () => ({
        data: {},
        error: undefined,
      })),
      status: mock(async () => ({
        data: {
          "sync-session-123": { type: "idle" },
        },
      })),
      messages: mock(async () => ({
        data: [
          { role: "user", content: "test prompt" },
          { role: "assistant", content: "task result here" },
        ],
      })),
      delete: mock(async () => ({})),
    },
  }
}

describe("resolveCategory", () => {
  describe("#given the resolveCategory function", () => {
    describe("#when resolving all 8 default categories", () => {
      it("#then each resolves to a valid config", () => {
        const expected = [
          "visual-engineering",
          "ultrabrain",
          "deep",
          "artistry",
          "quick",
          "unspecified-low",
          "unspecified-high",
          "writing",
        ]

        for (const name of expected) {
          const config = resolveCategory(name)
          expect(config).toBeDefined()
          expect(config!.model).toBeTypeOf("string")
          expect(config!.model.length).toBeGreaterThan(0)
        }
      })
    })

    describe("#when resolving visual-engineering", () => {
      it("#then returns google/gemini-3.1-pro with high variant", () => {
        const config = resolveCategory("visual-engineering")
        expect(config?.model).toBe("google/gemini-3.1-pro")
        expect(config?.variant).toBe("high")
        expect(config?.description).toBe("Frontend, UI/UX, design, styling, animation")
      })
    })

    describe("#when resolving ultrabrain", () => {
      it("#then returns openai/gpt-5.4 with xhigh variant", () => {
        const config = resolveCategory("ultrabrain")
        expect(config?.model).toBe("openai/gpt-5.4")
        expect(config?.variant).toBe("xhigh")
      })
    })

    describe("#when resolving an unknown category", () => {
      it("#then returns undefined", () => {
        const config = resolveCategory("nonexistent-category")
        expect(config).toBeUndefined()
      })
    })

    describe("#when listing categories", () => {
      it("#then returns all 8 category names", () => {
        expect(CATEGORY_NAMES).toHaveLength(8)
        expect(CATEGORY_NAMES).toContain("visual-engineering")
        expect(CATEGORY_NAMES).toContain("ultrabrain")
        expect(CATEGORY_NAMES).toContain("deep")
        expect(CATEGORY_NAMES).toContain("artistry")
        expect(CATEGORY_NAMES).toContain("quick")
        expect(CATEGORY_NAMES).toContain("unspecified-low")
        expect(CATEGORY_NAMES).toContain("unspecified-high")
        expect(CATEGORY_NAMES).toContain("writing")
      })
    })
  })
})

describe("DEFAULT_CATEGORIES", () => {
  describe("#given the constant map", () => {
    describe("#when checking category count", () => {
      it("#then has exactly 8 entries", () => {
        expect(Object.keys(DEFAULT_CATEGORIES)).toHaveLength(8)
      })
    })

    describe("#when checking each category has a model", () => {
      it("#then every entry has a provider/model format string", () => {
        for (const [name, config] of Object.entries(DEFAULT_CATEGORIES)) {
          expect(config.model).toContain("/")
          expect(config.model.split("/")).toHaveLength(2)
        }
      })
    })
  })
})

describe("CATEGORY_NAMES", () => {
  describe("#given the names array", () => {
    it("#then matches the keys of DEFAULT_CATEGORIES", () => {
      expect(CATEGORY_NAMES).toEqual(Object.keys(DEFAULT_CATEGORIES))
    })
  })
})

describe("createTaskTool", () => {
  describe("#given a task tool with mock manager", () => {
    const manager = makeMockManager()
    const tool = createTaskTool(manager as unknown as Parameters<typeof createTaskTool>[0])

    describe("#when executing with an unknown category", () => {
      it("#then returns an error listing available categories", async () => {
        const ctx = makeMockToolContext()
        const result = await tool.execute(
          {
            category: "bogus",
            description: "test task",
            prompt: "do something",
            run_in_background: false,
          },
          ctx,
        )
        expect(result).toContain("Unknown category")
        expect(result).toContain("bogus")
        expect(result).toContain("visual-engineering")
      })
    })

    describe("#when executing background task with valid category", () => {
      it("#then launches via manager and returns task id", async () => {
        const bgManager = makeMockManager()
        const bgTool = createTaskTool(
          bgManager as unknown as Parameters<typeof createTaskTool>[0],
        )
        const ctx = makeMockToolContext()

        const result = await bgTool.execute(
          {
            category: "quick",
            description: "fix typo",
            prompt: "fix the typo in readme",
            run_in_background: true,
          },
          ctx,
        )

        expect(result).toContain("Background task launched")
        expect(result).toContain("quick")
        expect(result).toContain("openai/gpt-5.4-mini")
        expect(bgManager.launch).toHaveBeenCalledTimes(1)
        expect(bgManager.launched[0].model).toBe("openai/gpt-5.4-mini")
      })
    })

    describe("#when executing sync task with valid category", () => {
      it("#then creates session and returns result", async () => {
        const syncManager = makeMockManager()
        const syncTool = createTaskTool(
          syncManager as unknown as Parameters<typeof createTaskTool>[0],
        )
        const ctx = makeMockToolContext()

        const result = await syncTool.execute(
          {
            category: "unspecified-low",
            description: "moderate task",
            prompt: "implement the feature",
            run_in_background: false,
          },
          ctx,
        )

        expect(result).toBe("task result here")
      })
    })
  })

  describe("#given the tool definition", () => {
    const manager = makeMockManager()
    const tool = createTaskTool(manager as unknown as Parameters<typeof createTaskTool>[0])

    describe("#when checking tool metadata", () => {
      it("#then has a description mentioning categories", () => {
        expect(tool.description).toContain("category-based agent")
        expect(tool.description).toContain("visual-engineering")
      })

      it("#then has args defined", () => {
        expect(tool.args).toBeDefined()
      })
    })
  })
})
