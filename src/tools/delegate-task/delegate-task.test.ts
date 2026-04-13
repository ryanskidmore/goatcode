import { describe, it, expect, mock } from "bun:test";
import { resolveCategory } from "./category-resolver";
import { DEFAULT_CATEGORIES, CATEGORY_NAMES } from "./constants";
import type { BackgroundTask, BackgroundAgentManager } from "../../runtime";
import { createTaskTool } from "./handler";
import type { ToolDefinition } from "@opencode-ai/plugin";

function makeMockManager(existingTasks: BackgroundTask[] = []) {
  const launched: Array<{
    id: string;
    prompt: string;
    model: string;
    parentSessionID?: string;
    title?: string;
    delegationDepth?: number;
  }> = [];
  const tasks = new Map<string, BackgroundTask>();
  for (const t of existingTasks) tasks.set(t.id, t);

  // State captured during trackSyncSession, used by waitForCompletion.
  let syncSessionId: string | undefined;
  let syncClient:
    | { session: { messages: (args: { path: { id: string } }) => Promise<{ data?: unknown }> } }
    | undefined;

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
          delegationDepth?: number;
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
    getAll: mock(() => [...tasks.values()]),
    getQueuePosition: mock((_id: string) => 0),
    complete: mock(() => {}),
    fail: mock(() => {}),
    cancel: mock(async () => {}),
    /** Capture ctx so waitForCompletion can read the mock session messages. */
    trackSyncSession: mock(
      (sessionId: string, _taskId: string, ctx: { client: typeof syncClient }) => {
        syncSessionId = sessionId;
        syncClient = ctx.client as typeof syncClient;
      },
    ),
    /**
     * Simulate event-driven completion: read the last assistant message from
     * the mock session messages, mirroring what handleSessionIdle() does in
     * the real BackgroundAgentManager.
     */
    waitForCompletion: mock(async (taskId: string, _timeoutMs: number) => {
      if (!syncSessionId || !syncClient) return undefined;
      const res = await syncClient.session.messages({ path: { id: syncSessionId } });
      type Msg = {
        role?: string;
        content?: string;
        info?: { role?: string };
        parts?: Array<{ type?: string; text?: string }>;
      };
      const messages = (res?.data ?? []) as Msg[];
      const lastMsg = messages[messages.length - 1];
      const role = lastMsg?.role ?? lastMsg?.info?.role;
      let result = "";
      if (role === "assistant") {
        if (typeof lastMsg?.content === "string") {
          result = lastMsg.content;
        } else if (Array.isArray(lastMsg?.parts)) {
          result = lastMsg.parts
            .filter((p) => p.type === "text" && typeof p.text === "string")
            .map((p) => p.text!)
            .join("\n\n");
        }
      }
      return {
        id: taskId,
        status: "completed" as BackgroundTask["status"],
        result,
        prompt: "",
        model: "",
        createdAt: Date.now(),
      } satisfies BackgroundTask;
    }),
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

function makeMockClient(opts?: { messages?: unknown[] }) {
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
        data: opts?.messages ?? [
          { role: "user", content: "test prompt" },
          { role: "assistant", content: "task result here" },
        ],
      })),
      delete: mock(async () => ({})),
    },
  };
}

function makeMockClientWithMessageFailure() {
  const base = makeMockClient();
  return {
    session: {
      ...base.session,
      messages: mock(async () => {
        throw new Error("session.messages failed");
      }),
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

    describe("#when resolving deep category", () => {
      it("#then includes delegate fallback_chain entries", () => {
        const config = resolveCategory("deep");
        expect(config?.model).toBe("gpt-5.3-codex");
        expect(Array.isArray(config?.fallback_chain)).toBe(true);
        expect(config?.fallback_chain?.length).toBeGreaterThan(0);
        expect(config?.fallback_chain?.[0]).toEqual(
          expect.objectContaining({
            model: "gpt-5.3-codex",
            providers: expect.arrayContaining(["openai"]),
          }),
        );
      });

      it("#then applies category fallback_models with append mode", () => {
        const config = resolveCategory("deep", {
          deep: {
            fallback_models: ["google/gemini-3.1-pro"],
            fallback_mode: "append",
          },
        });

        expect(config?.fallback_chain?.[0]).toEqual(
          expect.objectContaining({
            model: "gpt-5.3-codex",
          }),
        );
        expect(config?.fallback_chain?.some((entry) => entry.model === "gemini-3.1-pro")).toBe(
          true,
        );
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
            subagent_type: "bogus",
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

    describe("#when delegation is blocked by depth policy", () => {
      it("#then returns structured DEPTH_LIMIT_REACHED and does not launch", async () => {
        const bgManager = makeMockManager();
        const bgTool = createTaskTool(() => bgManager as unknown as BackgroundAgentManager);
        const events: unknown[] = [];
        const depthTwoClient = makeMockClient({
          messages: [
            { role: "user", content: "<!-- goatcode:delegation_depth=2 -->" },
            { role: "assistant", content: "existing context" },
          ],
        });
        const ctx = makeMockToolContext({
          client: depthTwoClient,
          metadata: (input: unknown) => events.push(input),
        });

        const result = await bgTool.execute(
          {
            category: "quick",
            subagent_type: "worker",
            description: "blocked task",
            prompt: "delegate this",
            run_in_background: true,
          },
          ctx,
        );

        expect(result).toContain("Delegation blocked: maximum depth (2) reached.");
        expect(result).toContain("<task_error>");
        expect(result).toContain("code: DEPTH_LIMIT_REACHED");
        expect(result).toContain("retryable: false");
        expect(result).toContain("recommended_action: execute_directly");
        expect(result).toContain("current_depth: 2");
        expect(result).toContain("max_depth: 2");
        expect(bgManager.launch).not.toHaveBeenCalled();
        expect(events).toHaveLength(1);
        expect(events[0]).toEqual(
          expect.objectContaining({
            metadata: expect.objectContaining({
              error_code: "DEPTH_LIMIT_REACHED",
              retryable: false,
              recommended_action: "execute_directly",
              current_depth: 2,
              max_depth: 2,
              category: "quick",
              subagent_type: "worker",
            }),
          }),
        );
      });

      it("#then returns structured DEPTH_LOOKUP_FAILED when depth cannot be read", async () => {
        const bgManager = makeMockManager();
        const bgTool = createTaskTool(() => bgManager as unknown as BackgroundAgentManager);
        const events: unknown[] = [];
        const failingClient = makeMockClientWithMessageFailure();
        const ctx = makeMockToolContext({
          client: failingClient,
          metadata: (input: unknown) => events.push(input),
        });

        const result = await bgTool.execute(
          {
            category: "quick",
            subagent_type: "worker",
            description: "blocked depth lookup",
            prompt: "delegate this",
            run_in_background: true,
          },
          ctx,
        );

        expect(result).toContain(
          "Delegation blocked: unable to determine current delegation depth.",
        );
        expect(result).toContain("<task_error>");
        expect(result).toContain("code: DEPTH_LOOKUP_FAILED");
        expect(result).toContain("retryable: false");
        expect(result).toContain("recommended_action: execute_directly");
        expect(bgManager.launch).not.toHaveBeenCalled();
        expect(events).toHaveLength(1);
        expect(events[0]).toEqual(
          expect.objectContaining({
            metadata: expect.objectContaining({
              error_code: "DEPTH_LOOKUP_FAILED",
              retryable: false,
              recommended_action: "execute_directly",
              max_depth: 2,
              category: "quick",
              subagent_type: "worker",
            }),
          }),
        );
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
            subagent_type: "quick",
            description: "fix typo",
            prompt: "fix the typo in readme",
            run_in_background: true,
          },
          ctx,
        );

        expect(result).toContain("Background task launched");
        expect(result).toContain("quick");
        expect(result).toContain("gpt-5.4-mini");
        expect(result).toContain("Status: running");
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
        // Two metadata emissions: early (title/subagent) + full (with sessionId)
        expect(events.length).toBe(2);
        // Early emission: no sessionId yet
        expect(events[0]).toEqual(
          expect.objectContaining({
            title: "fix typo",
            metadata: expect.objectContaining({
              category: "quick",
              subagent_type: "worker",
              prompt: "fix the typo in readme",
            }),
          }),
        );
        // Full emission: includes sessionId
        expect(events[1]).toEqual(
          expect.objectContaining({
            title: "fix typo",
            metadata: expect.objectContaining({
              category: "quick",
              session_id: expect.stringMatching(/^ses_task_/),
              sessionId: expect.stringMatching(/^ses_task_/),
              parentMessageId: "test-message",
              parent_message_id: "test-message",
              subagent_type: "worker",
            }),
          }),
        );
      });

      it("#then resolves nested parent session and message identifiers", async () => {
        const bgManager = makeMockManager();
        const bgTool = createTaskTool(() => bgManager as unknown as BackgroundAgentManager);
        const events: unknown[] = [];
        const ctx = makeMockToolContext({
          sessionID: undefined,
          sessionId: "nested-session-42",
          messageID: undefined,
          messageId: "nested-message-42",
          metadata: (input: unknown) => events.push(input),
        });

        const result = await bgTool.execute(
          {
            category: "deep",
            subagent_type: "deepworker",
            description: "nested handoff",
            prompt: "continue in nested subagent",
            run_in_background: true,
          },
          ctx,
        );

        expect(bgManager.launched[0].parentSessionID).toBe("nested-session-42");
        expect(result).toContain("Status: running");
        // Second emission has full metadata including sessionId
        expect(events[1]).toEqual(
          expect.objectContaining({
            metadata: expect.objectContaining({
              session_id: expect.stringMatching(/^ses_task_/),
              sessionId: expect.stringMatching(/^ses_task_/),
              parentMessageId: "nested-message-42",
              parent_message_id: "nested-message-42",
            }),
          }),
        );
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
            subagent_type: "unspecified-low",
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
            subagent_type: "unspecified-low",
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
            subagent_type: "unspecified-low",
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
            subagent_type: "unspecified-low",
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

  describe("#when executing background task", () => {
    it("#then passes delegationDepth as childDepth to manager.launch", async () => {
      const bgManager = makeMockManager();
      const bgTool = createTaskTool(() => bgManager as unknown as BackgroundAgentManager);
      const ctx = makeMockToolContext();

      await bgTool.execute(
        {
          category: "quick",
          subagent_type: "quick",
          description: "test depth",
          prompt: "do work",
          run_in_background: true,
        },
        ctx,
      );

      // depth=0 (root) → child should be depth=1
      expect(bgManager.launched[0].delegationDepth).toBe(1);
    });

    it("#then injects hard no-subdelegation guidance when child reaches max depth", async () => {
      const bgManager = makeMockManager();
      const bgTool = createTaskTool(() => bgManager as unknown as BackgroundAgentManager);
      const depthOneClient = makeMockClient({
        messages: [
          { role: "user", content: "<!-- goatcode:delegation_depth=1 -->" },
          { role: "assistant", content: "task result here" },
        ],
      });
      const ctx = makeMockToolContext({ client: depthOneClient });

      await bgTool.execute(
        {
          category: "quick",
          subagent_type: "quick",
          description: "depth-two task",
          prompt: "do work",
          run_in_background: true,
        },
        ctx,
      );

      expect(bgManager.launched[0].prompt).toContain("<!-- goatcode:delegation_depth=2 -->");
      expect(bgManager.launched[0].prompt).toContain("Hard Delegation Depth Stop");
      expect(bgManager.launched[0].prompt).toContain(
        "Do NOT call `task` or `delegate_task` again in this session.",
      );
    });
  });

  describe("#when executing sync task at depth 1", () => {
    it("#then injects hard no-subdelegation guidance into sync prompt", async () => {
      const syncManager = makeMockManager();
      const syncTool = createTaskTool(() => syncManager as unknown as BackgroundAgentManager);
      const depthOneClient = makeMockClient({
        messages: [
          { role: "user", content: "<!-- goatcode:delegation_depth=1 -->" },
          { role: "assistant", content: "task result here" },
        ],
      });
      const ctx = makeMockToolContext({ client: depthOneClient });

      await syncTool.execute(
        {
          category: "unspecified-low",
          subagent_type: "unspecified-low",
          description: "sync depth two",
          prompt: "implement the feature",
          run_in_background: false,
        },
        ctx,
      );

      const promptCalls = (depthOneClient.session.promptAsync as ReturnType<typeof mock>).mock
        .calls;
      expect(promptCalls.length).toBeGreaterThan(0);

      const promptRequest = promptCalls[0]?.[0] as {
        body?: { parts?: Array<{ type?: string; text?: string }> };
      };
      const promptText = promptRequest.body?.parts?.[0]?.text ?? "";

      expect(promptText).toContain("<!-- goatcode:delegation_depth=2 -->");
      expect(promptText).toContain("Hard Delegation Depth Stop");
      expect(promptText).toContain("Do NOT call `task` or `delegate_task` again in this session.");
    });
  });

  describe("#when fan-out limit is exceeded", () => {
    it("#then returns error instead of launching", async () => {
      const existingChildren: BackgroundTask[] = [
        {
          id: "child-1",
          status: "running",
          prompt: "",
          model: "m",
          createdAt: 0,
          parentSessionID: "test-session",
        },
        {
          id: "child-2",
          status: "running",
          prompt: "",
          model: "m",
          createdAt: 0,
          parentSessionID: "test-session",
        },
        {
          id: "child-3",
          status: "queued",
          prompt: "",
          model: "m",
          createdAt: 0,
          parentSessionID: "test-session",
        },
        {
          id: "child-4",
          status: "running",
          prompt: "",
          model: "m",
          createdAt: 0,
          parentSessionID: "test-session",
        },
        {
          id: "child-5",
          status: "running",
          prompt: "",
          model: "m",
          createdAt: 0,
          parentSessionID: "test-session",
        },
        {
          id: "child-6",
          status: "queued",
          prompt: "",
          model: "m",
          createdAt: 0,
          parentSessionID: "test-session",
        },
      ];
      const bgManager = makeMockManager(existingChildren);
      const bgTool = createTaskTool(() => bgManager as unknown as BackgroundAgentManager);
      const ctx = makeMockToolContext();

      const result = await bgTool.execute(
        {
          category: "quick",
          subagent_type: "quick",
          description: "seventh task",
          prompt: "this should fail",
          run_in_background: true,
        },
        ctx,
      );

      expect(result).toContain("per-parent limit");
      expect(result).toContain("6");
      expect(bgManager.launch).not.toHaveBeenCalled();
    });
  });

  describe("#when fan-out limit is not reached", () => {
    it("#then launches successfully", async () => {
      const existingChildren: BackgroundTask[] = [
        {
          id: "child-1",
          status: "running",
          prompt: "",
          model: "m",
          createdAt: 0,
          parentSessionID: "test-session",
        },
        {
          id: "child-2",
          status: "running",
          prompt: "",
          model: "m",
          createdAt: 0,
          parentSessionID: "test-session",
        },
      ];
      const bgManager = makeMockManager(existingChildren);
      const bgTool = createTaskTool(() => bgManager as unknown as BackgroundAgentManager);
      const ctx = makeMockToolContext();

      const result = await bgTool.execute(
        {
          category: "quick",
          subagent_type: "quick",
          description: "third task",
          prompt: "this should succeed",
          run_in_background: true,
        },
        ctx,
      );

      expect(result).toContain("Background task launched");
      expect(bgManager.launch).toHaveBeenCalledTimes(1);
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
