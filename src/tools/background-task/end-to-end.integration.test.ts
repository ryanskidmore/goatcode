import { describe, it, expect, mock, afterAll } from "bun:test";
import type { ToolDefinition } from "@opencode-ai/plugin";
import type { BackgroundAgentManager as ManagerType } from "../../runtime";

// ── Stub the spawner so no real OpenCode sessions are created ───────
// The real manager imports ./spawner — mock it before dynamic imports
// so the manager's startTask() path uses our stub instead of calling
// OpenCode. The rest of the manager state machine runs for real.
mock.module("../../features/background-agent/spawner", () => ({
  spawnBackgroundSession: mock(async () => ({ sessionId: "ses_e2e_child" })),
}));

// Dynamic imports must follow mock.module so the mock is active
const { BackgroundAgentManager } = await import("../../features/background-agent/manager");
const { createTaskTool } = await import("../delegate-task/handler");
const { handleBackgroundOutput } = await import("./output/handler");

afterAll(() => {
  mock.restore();
});

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Build a mock client whose session.messages returns assistant content
 * for the spawned child session and empty data for anything else
 * (used by depth extraction on the parent session).
 */
function makeMockClient() {
  return {
    session: {
      messages: mock(async (opts: { path?: { id?: string } }) => {
        if (opts?.path?.id === "ses_e2e_child") {
          return {
            data: [
              {
                role: "assistant",
                parts: [{ type: "text", text: "task complete" }],
              },
            ],
          };
        }
        // Depth extraction for the parent session — no depth marker → depth 0
        return { data: [] };
      }),
      delete: mock(async () => ({})),
      status: mock(async () => ({ data: {} })),
      create: mock(async () => ({ data: { id: "unused" }, error: undefined })),
      promptAsync: mock(async () => ({ data: {}, error: undefined })),
    },
  };
}

function makeMockToolContext(client: ReturnType<typeof makeMockClient>) {
  return {
    sessionID: "test-parent-session",
    messageID: "test-parent-message",
    agent: "test-agent",
    directory: "/tmp/test",
    worktree: "/tmp/test",
    abort: new AbortController().signal,
    metadata: () => {},
    ask: async () => {},
    client,
  } as unknown as Parameters<ToolDefinition["execute"]>[1];
}

function extractTaskId(result: string): string {
  const match = result.match(/task_id:\s*(task_\S+)/);
  if (!match) throw new Error(`Could not extract task_id from result:\n${result}`);
  return match[1];
}

// ── Integration test ────────────────────────────────────────────────

describe("Background task end-to-end integration", () => {
  describe("#given a real BackgroundAgentManager wired to delegate_task and background_output", () => {
    describe("#when a task is launched in the background, an idle event fires, and output is retrieved", () => {
      it("#then the full delegate → event → output lifecycle produces the expected result", async () => {
        // ── Step 1: Create a real manager (spawner stubbed at module level) ──
        const manager = new BackgroundAgentManager();

        // ── Step 2: Create the delegate_task tool wired to the real manager ──
        const delegateTool = createTaskTool(() => manager as unknown as ManagerType);

        // ── Step 3: Build mock client & tool context ──
        const client = makeMockClient();
        const ctx = makeMockToolContext(client);

        // ── Step 4: Call delegate_task with run_in_background: true ──
        const delegateResult = (await delegateTool.execute(
          {
            category: "quick",
            subagent_type: "quick",
            description: "test",
            prompt: "do something",
            run_in_background: true,
          },
          ctx,
        )) as string;

        expect(delegateResult).toContain("Background task launched");
        expect(delegateResult).toContain("Status: running");

        // ── Step 5: Extract the task_id from the delegate_task response ──
        const taskId = extractTaskId(delegateResult);
        expect(taskId).toMatch(/^task_/);

        // Verify the manager has a running task with the spawned session
        const runningTask = manager.get(taskId);
        expect(runningTask).toBeDefined();
        expect(runningTask!.status).toBe("running");
        expect(runningTask!.sessionId).toBe("ses_e2e_child");

        // ── Step 6: Fire idle event (simulates background agent completing) ──
        // The event-hook (event-hook.ts) would normally route session.idle
        // events to manager.handleSessionIdle — we call it directly here.
        // The time guard is bypassed because the transcript has assistant content.
        await manager.handleSessionIdle("ses_e2e_child");

        // Verify the task transitioned to completed with extracted assistant content
        const completedTask = manager.get(taskId);
        expect(completedTask).toBeDefined();
        expect(completedTask!.status).toBe("completed");
        expect(completedTask!.result).toBe("task complete");

        // ── Step 7: Call background_output and verify it surfaces the result ──
        const outputResult = await handleBackgroundOutput(manager as unknown as ManagerType, {
          task_id: taskId,
        });

        expect(outputResult).toContain("completed");
        expect(outputResult).toContain("task complete");
      });
    });
  });
});
