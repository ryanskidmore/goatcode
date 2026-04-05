import { describe, it, expect, mock } from "bun:test";
import { readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveCategory } from "./category-resolver";
import { DEFAULT_CATEGORIES, CATEGORY_NAMES } from "./constants";
import type { BackgroundTask, BackgroundAgentManager } from "../../runtime";
import { createTaskTool } from "./handler";
import type { ToolDefinition } from "@opencode-ai/plugin";

function makeMockManager() {
  const launched: Array<{
    id: string;
    prompt: string;
    model: string;
    parentSessionID?: string;
    title?: string;
  }> = [];
  const tasks = new Map<string, BackgroundTask>();
  return {
    launched,
    launch: mock(
      async (
        _ctx: unknown,
        input: {
          id: string;
          prompt: string;
          model: string;
          parentSessionID?: string;
          title?: string;
        },
      ) => {
        launched.push(input);
        const task = {
          id: input.id,
          sessionId: `ses_${input.id}`,
          status: "queued" as BackgroundTask["status"],
          prompt: input.prompt,
          model: input.model,
          createdAt: Date.now(),
        };
        tasks.set(input.id, task);
        return task;
      },
    ),
    get: mock((id: string) => tasks.get(id)),
    getAll: mock(() => []),
    complete: mock(() => {}),
    fail: mock(() => {}),
    cancel: mock(async () => {}),
  };
}

function makeMockToolContext(overrides: Record<string, unknown> = {}) {
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
  } as unknown as Parameters<ToolDefinition["execute"]>[1];
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
  };
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
        ];

        for (const name of expected) {
          const config = resolveCategory(name);
          expect(config).toBeDefined();
          expect(config?.model).toBeTypeOf("string");
          expect((config?.model ?? "").length).toBeGreaterThan(0);
        }
      });
    });

    describe("#when resolving visual-engineering", () => {
      it("#then returns gemini-3.1-pro with high variant", () => {
        const config = resolveCategory("visual-engineering");
        expect(config?.model).toBe("gemini-3.1-pro");
        expect(config?.variant).toBe("high");
        expect(config?.description).toBe("Frontend, UI/UX, design, styling, animation");
      });
    });

    describe("#when resolving ultrabrain", () => {
      it("#then returns gpt-5.4 with xhigh variant", () => {
        const config = resolveCategory("ultrabrain");
        expect(config?.model).toBe("gpt-5.4");
        expect(config?.variant).toBe("xhigh");
      });
    });

    describe("#when resolving an unknown category", () => {
      it("#then returns undefined", () => {
        const config = resolveCategory("nonexistent-category");
        expect(config).toBeUndefined();
      });
    });

    describe("#when listing categories", () => {
      it("#then returns all 8 category names", () => {
        expect(CATEGORY_NAMES).toHaveLength(8);
        expect(CATEGORY_NAMES).toContain("visual-engineering");
        expect(CATEGORY_NAMES).toContain("ultrabrain");
        expect(CATEGORY_NAMES).toContain("deep");
        expect(CATEGORY_NAMES).toContain("artistry");
        expect(CATEGORY_NAMES).toContain("quick");
        expect(CATEGORY_NAMES).toContain("unspecified-low");
        expect(CATEGORY_NAMES).toContain("unspecified-high");
        expect(CATEGORY_NAMES).toContain("writing");
      });
    });
  });
});

describe("DEFAULT_CATEGORIES", () => {
  describe("#given the constant map", () => {
    describe("#when checking category count", () => {
      it("#then has exactly 8 entries", () => {
        expect(Object.keys(DEFAULT_CATEGORIES)).toHaveLength(8);
      });
    });

    describe("#when checking each category has a model", () => {
      it("#then every entry has a non-empty model string", () => {
        for (const [, config] of Object.entries(DEFAULT_CATEGORIES)) {
          expect(config.model.length).toBeGreaterThan(0);
        }
      });
    });
  });
});

describe("CATEGORY_NAMES", () => {
  describe("#given the names array", () => {
    it("#then matches the keys of DEFAULT_CATEGORIES", () => {
      expect(CATEGORY_NAMES).toEqual(Object.keys(DEFAULT_CATEGORIES));
    });
  });
});

describe("createTaskTool", () => {
  describe("#given a task tool with mock manager", () => {
    const manager = makeMockManager();
    const tool = createTaskTool(() => manager as unknown as BackgroundAgentManager);

    describe("#when executing with an unknown category", () => {
      it("#then returns an error listing available categories", async () => {
        const ctx = makeMockToolContext();
        const result = await tool.execute(
          {
            category: "bogus",
            description: "test task",
            prompt: "do something",
            run_in_background: false,
          },
          ctx,
        );
        expect(result).toContain("Unknown category");
        expect(result).toContain("bogus");
        expect(result).toContain("visual-engineering");
      });
    });

    describe("#when executing background task with valid category", () => {
      it("#then launches via manager and returns task id", async () => {
        const bgManager = makeMockManager();
        const bgTool = createTaskTool(() => bgManager as unknown as BackgroundAgentManager);
        const ctx = makeMockToolContext();

        const result = await bgTool.execute(
          {
            category: "quick",
            description: "fix typo",
            prompt: "fix the typo in readme",
            run_in_background: true,
          },
          ctx,
        );

        expect(result).toContain("Background task launched");
        expect(result).toContain("quick");
        expect(result).toContain("gpt-5.4-mini");
        expect(result).toContain("Session ID: ses_task_");
        expect(result).toContain("Agent: quick (subagent)");
        expect(result).toContain("subagent: quick");
        expect(bgManager.launch).toHaveBeenCalledTimes(1);
        expect(bgManager.launched[0].model).toBe("gpt-5.4-mini");
        expect(bgManager.launched[0].parentSessionID).toBe("test-session");
        expect(bgManager.launched[0].title).toBe("fix typo (@quick subagent)");
      });

      it("#then includes task metadata with subagent label", async () => {
        const bgManager = makeMockManager();
        const bgTool = createTaskTool(() => bgManager as unknown as BackgroundAgentManager);
        const events: unknown[] = [];
        const ctx = makeMockToolContext({
          metadata: (input: unknown) => events.push(input),
        });

        const result = await bgTool.execute(
          {
            category: "quick",
            subagent_type: "worker",
            description: "fix typo",
            prompt: "fix the typo in readme",
            run_in_background: true,
          },
          ctx,
        );

        expect(result).toContain("<task_metadata>");
        expect(result).toContain("Session ID: ses_task_");
        expect(result).toContain("session_id: ses_");
        expect(result).toContain("subagent: worker");
        expect(events.length).toBe(1);
        expect(events[0]).toEqual(
          expect.objectContaining({
            title: "fix typo",
            metadata: expect.objectContaining({
              category: "quick",
              session_id: expect.stringMatching(/^ses_task_/),
              sessionId: expect.stringMatching(/^ses_task_/),
              subagent_type: "worker",
            }),
          }),
        );
      });

      it("#then emits GoatCode delegation debug logs", async () => {
        const bgManager = makeMockManager();
        const bgTool = createTaskTool(() => bgManager as unknown as BackgroundAgentManager);
        const filePath = join(tmpdir(), `goatcode-delegation-${Date.now()}.log`);
        process.env.GOATCODE_DEBUG_DELEGATION = "1";
        process.env.GOATCODE_DEBUG_DELEGATION_FILE = filePath;
        const ctx = makeMockToolContext();

        await bgTool.execute(
          {
            category: "quick",
            description: "fix typo",
            prompt: "fix the typo in readme",
            run_in_background: true,
          },
          ctx,
        );

        const content = readFileSync(filePath, "utf8");
        expect(content).toContain("delegate.background.launch.start");
        expect(content).toContain("delegate.metadata.emitted");

        delete process.env.GOATCODE_DEBUG_DELEGATION;
        delete process.env.GOATCODE_DEBUG_DELEGATION_FILE;
        rmSync(filePath, { force: true });
      });
    });

    describe("#when executing sync task with valid category", () => {
      it("#then creates session and returns result", async () => {
        const syncManager = makeMockManager();
        const syncTool = createTaskTool(() => syncManager as unknown as BackgroundAgentManager);
        const ctx = makeMockToolContext();

        const result = await syncTool.execute(
          {
            category: "unspecified-low",
            description: "moderate task",
            prompt: "implement the feature",
            run_in_background: false,
          },
          ctx,
        );

        expect(result).toContain("task result here");
        expect(result).toContain("<task_metadata>");
        expect(result).toContain("session_id: sync-session-123");
        expect(result).toContain("subagent: unspecified-low");
      });

      it("#then creates sync session as a child of the parent session", async () => {
        const syncManager = makeMockManager();
        const syncTool = createTaskTool(() => syncManager as unknown as BackgroundAgentManager);
        const client = makeMockClient();
        const ctx = makeMockToolContext({ client });

        await syncTool.execute(
          {
            category: "unspecified-low",
            description: "moderate task",
            prompt: "implement the feature",
            run_in_background: false,
          },
          ctx,
        );

        expect(client.session.create).toHaveBeenCalledWith(
          expect.objectContaining({
            body: expect.objectContaining({
              parentID: "test-session",
            }),
          }),
        );
      });

      it("#then emits metadata with sessionId and default subagent label", async () => {
        const syncManager = makeMockManager();
        const syncTool = createTaskTool(() => syncManager as unknown as BackgroundAgentManager);
        const events: unknown[] = [];
        const ctx = makeMockToolContext({
          metadata: (input: unknown) => events.push(input),
        });

        const result = await syncTool.execute(
          {
            category: "unspecified-low",
            description: "moderate task",
            prompt: "implement the feature",
            run_in_background: false,
          },
          ctx,
        );

        expect(result).toContain("task result here");
        expect(events.length).toBe(1);
        expect(events[0]).toEqual(
          expect.objectContaining({
            title: "moderate task",
            metadata: expect.objectContaining({
              category: "unspecified-low",
              session_id: "sync-session-123",
              sessionId: "sync-session-123",
              subagent_type: "unspecified-low",
            }),
          }),
        );
      });
    });

    describe("#when OpenCode returns structured message format", () => {
      it("#then extracts text from parts array", async () => {
        const structuredManager = makeMockManager();
        const structuredClient = {
          session: {
            create: mock(async () => ({
              data: { id: "structured-session-123" },
              error: undefined,
            })),
            promptAsync: mock(async () => ({
              data: {},
              error: undefined,
            })),
            status: mock(async () => ({
              data: {
                "structured-session-123": { type: "idle" },
              },
            })),
            // Return the structured format OpenCode actually uses
            messages: mock(async () => ({
              data: [
                {
                  info: { id: "msg_1", role: "user", sessionID: "s1" },
                  parts: [{ type: "text", text: "implement the feature" }],
                },
                {
                  info: { id: "msg_2", role: "assistant", sessionID: "s1" },
                  parts: [
                    { type: "text", text: "I implemented the feature." },
                    { type: "text", text: "Here are the details." },
                  ],
                },
              ],
            })),
            delete: mock(async () => ({})),
          },
        };
        const ctx = makeMockToolContext() as Record<string, unknown>;
        ctx.client = structuredClient;
        const structuredTool = createTaskTool(
          () => structuredManager as unknown as BackgroundAgentManager,
        );

        const result = await structuredTool.execute(
          {
            category: "unspecified-low",
            description: "structured test",
            prompt: "implement the feature",
            run_in_background: false,
          },
          ctx as unknown as Parameters<ToolDefinition["execute"]>[1],
        );

        expect(result).toContain("I implemented the feature.");
        expect(result).toContain("Here are the details.");
      });
    });
  });

  describe("#given the tool definition", () => {
    const manager = makeMockManager();
    const tool = createTaskTool(() => manager as unknown as BackgroundAgentManager);

    describe("#when checking tool metadata", () => {
      it("#then has a description mentioning categories", () => {
        expect(tool.description).toContain("category-based agent");
        expect(tool.description).toContain("visual-engineering");
      });

      it("#then has args defined", () => {
        expect(tool.args).toBeDefined();
      });
    });
  });
});
