import { describe, it, expect, mock } from "bun:test";
import type { BackgroundTask, BackgroundAgentManager } from "../../../runtime";
import type { OpenCodeContext } from "../../../types/plugin";
import { handleBackgroundOutput } from "./handler";

function makeTask(overrides: Partial<BackgroundTask> = {}): BackgroundTask {
  return {
    id: "task-42",
    status: "running",
    prompt: "do work",
    model: "claude-3",
    createdAt: Date.now() - 10000,
    startedAt: Date.now() - 9000,
    ...overrides,
  };
}

function makeManager(task: BackgroundTask | undefined): BackgroundAgentManager {
  return {
    get: mock((_id: string) => task),
    getAll: mock(() => (task ? [task] : [])),
    cancel: mock(async () => {}),
    launch: mock(async () => task!),
    complete: mock(() => {}),
    fail: mock(() => {}),
    waitForCompletion: mock(async (_id: string, _timeout: number) => task),
  } as unknown as BackgroundAgentManager;
}

function makeClient(
  messages: Array<{ id?: string; role?: string; content?: string }> = [],
): OpenCodeContext["client"] {
  // Transform flat test messages to the real API shape: { info: Message; parts: Part[] }
  const apiMessages = messages.map((m) => ({
    info: { id: m.id, role: m.role, time: { created: Date.now() } },
    parts: [{ type: "text", text: m.content ?? "" }],
  }));
  return {
    session: {
      messages: mock(async () => ({ data: apiMessages })),
      status: mock(async () => ({ data: {} })),
    },
  } as unknown as OpenCodeContext["client"];
}

describe("handleBackgroundOutput", () => {
  describe("#given a nonexistent task", () => {
    describe("#when called with unknown task_id", () => {
      it("#then returns task not found message", async () => {
        const manager = makeManager(undefined);

        const result = await handleBackgroundOutput(manager, { task_id: "no-such-task" });

        expect(result).toContain("Task not found: no-such-task");
      });
    });
  });

  describe("#given a queued task", () => {
    describe("#when called without block", () => {
      it("#then returns queued status info", async () => {
        const task = makeTask({ status: "queued", startedAt: undefined });
        const manager = makeManager(task);

        const result = await handleBackgroundOutput(manager, { task_id: "task-42" });

        expect(result).toContain("queued");
        expect(result).toContain("task-42");
      });
    });
  });

  describe("#given a completed task", () => {
    describe("#when called", () => {
      it("#then returns the completed result", async () => {
        const task = makeTask({ status: "completed", result: "final answer: 42" });
        const manager = makeManager(task);

        const result = await handleBackgroundOutput(manager, { task_id: "task-42" });

        expect(result).toContain("completed");
        expect(result).toContain("final answer: 42");
      });

      it("#then falls back to final assistant session message when task result is empty", async () => {
        const task = makeTask({ status: "completed", result: "", sessionId: "ses_test123" });
        const manager = makeManager(task);
        const client = makeClient([
          { id: "msg1", role: "user", content: "do work" },
          { id: "msg2", role: "assistant", content: "useful final answer" },
        ]);

        const result = await handleBackgroundOutput(manager, { task_id: "task-42" }, client);

        expect(result).toContain("completed");
        expect(result).toContain("useful final answer");
        expect(result).not.toContain("(no output)");
      });

      it("#then keeps no-output fallback when task result is empty and no client is provided", async () => {
        const task = makeTask({ status: "completed", result: "", sessionId: "ses_test123" });
        const manager = makeManager(task);

        const result = await handleBackgroundOutput(manager, { task_id: "task-42" });

        expect(result).toContain("completed");
        expect(result).toContain("(no output)");
      });
    });
  });

  describe("#given a failed task", () => {
    describe("#when called", () => {
      it("#then returns the error details", async () => {
        const task = makeTask({ status: "failed", error: "rate limit exceeded" });
        const manager = makeManager(task);

        const result = await handleBackgroundOutput(manager, { task_id: "task-42" });

        expect(result).toContain("failed");
        expect(result).toContain("rate limit exceeded");
      });

      it("#then includes actionable fallback diagnostics when available", async () => {
        const task = makeTask({
          status: "failed",
          error: "fallback failed",
          retryCount: 2,
          attemptedModels: ["openai/gpt-5.3-codex", "anthropic/claude-opus-4-6"],
          fallbackChain: [
            { providers: ["openai", "opencode"], model: "gpt-5.3-codex" },
            { providers: ["anthropic", "opencode"], model: "claude-opus-4-6" },
          ],
        });
        const manager = makeManager(task);

        const result = await handleBackgroundOutput(manager, { task_id: "task-42" });

        expect(result).toContain("fallback retries attempted: 2");
        expect(result).toContain(
          "attempted models: openai/gpt-5.3-codex, anthropic/claude-opus-4-6",
        );
        expect(result).toContain(
          "fallback chain: openai|opencode/gpt-5.3-codex -> anthropic|opencode/claude-opus-4-6",
        );
      });
    });
  });

  describe("#given a cancelled task", () => {
    describe("#when called", () => {
      it("#then returns cancelled message", async () => {
        const task = makeTask({ status: "cancelled" });
        const manager = makeManager(task);

        const result = await handleBackgroundOutput(manager, { task_id: "task-42" });

        expect(result).toContain("cancelled");
      });
    });
  });

  describe("#given a running task with no startedAt", () => {
    describe("#when called without block", () => {
      it("#then returns running status with unknown elapsed", async () => {
        const task = makeTask({ status: "running", startedAt: undefined });
        const manager = makeManager(task);

        const result = await handleBackgroundOutput(manager, { task_id: "task-42" });

        expect(result).toContain("running");
        expect(result).toContain("unknown");
      });
    });
  });

  describe("#given block=true waiting behavior", () => {
    describe("#when task completes via event before timeout", () => {
      it("#then returns completed result promptly", async () => {
        // get() returns running so the handler enters the blocking path;
        // waitForCompletion resolves with completed to simulate event.
        const runningTask = makeTask({ status: "running" });
        const completedTask = makeTask({ status: "completed", result: "done quickly" });
        const manager = {
          get: mock((_id: string) => runningTask),
          getAll: mock(() => [runningTask]),
          cancel: mock(async () => {}),
          launch: mock(async () => runningTask),
          complete: mock(() => {}),
          fail: mock(() => {}),
          waitForCompletion: mock(async (_id: string, _timeout: number) => completedTask),
        } as unknown as BackgroundAgentManager;

        const start = Date.now();
        const result = await handleBackgroundOutput(manager, {
          task_id: "task-42",
          block: true,
          timeout: 5_000,
        });
        const elapsed = Date.now() - start;

        expect(result).toContain("completed");
        expect(result).toContain("done quickly");
        expect(elapsed).toBeLessThan(1_500);
      });
    });

    describe("#when task is still running after timeout", () => {
      it("#then returns timeout message without poll budget warning", async () => {
        const runningTask = makeTask({ status: "running" });
        const manager = makeManager(runningTask);

        const result = await handleBackgroundOutput(manager, {
          task_id: "task-42",
          block: true,
          timeout: 300,
        });

        expect(result).toContain("Timed out waiting after 300ms");
        expect(result).toContain("still running");
        // No poll budget exhaustion warning — event-driven model
        expect(result).not.toContain("POLLING BUDGET");
        expect(result).not.toContain("Cancel this task");
      });
    });

    describe("#when large timeout is requested", () => {
      it("#then respects the full timeout without silent capping", async () => {
        // First get() returns running (so handler enters blocking path),
        // then waitForCompletion resolves with completed.
        const runningTask = makeTask({ status: "running" });
        const completedTask = makeTask({ status: "completed", result: "done" });
        let waitCalledWithTimeout: number | undefined;
        const manager = {
          get: mock((_id: string) => runningTask),
          getAll: mock(() => [runningTask]),
          cancel: mock(async () => {}),
          launch: mock(async () => runningTask),
          complete: mock(() => {}),
          fail: mock(() => {}),
          waitForCompletion: mock(async (_id: string, timeout: number) => {
            waitCalledWithTimeout = timeout;
            return completedTask;
          }),
        } as unknown as BackgroundAgentManager;

        const result = await handleBackgroundOutput(manager, {
          task_id: "task-42",
          block: true,
          timeout: 999_999_999,
        });

        expect(result).toContain("completed");
        expect(result).toContain("done");
        // Verify waitForCompletion was called with the FULL timeout (no capping)
        expect(waitCalledWithTimeout).toBe(999_999_999);
      });
    });
  });

  describe("#given full_session mode with client", () => {
    describe("#when task has sessionId and full_session is true", () => {
      it("#then returns session messages", async () => {
        const task = makeTask({
          status: "completed",
          sessionId: "ses_test123",
          result: "final answer",
        });
        const manager = makeManager(task);
        const client = makeClient([
          { id: "msg1", role: "user", content: "do work" },
          { id: "msg2", role: "assistant", content: "here is the result" },
        ]);

        const result = await handleBackgroundOutput(
          manager,
          { task_id: "task-42", full_session: true },
          client,
        );

        expect(result).toContain("ses_test123");
        expect(result).toContain("here is the result");
      });
    });

    describe("#when full_session is true but no client provided", () => {
      it("#then falls back to basic output", async () => {
        const task = makeTask({
          status: "completed",
          sessionId: "ses_test123",
          result: "final answer",
        });
        const manager = makeManager(task);

        const result = await handleBackgroundOutput(manager, {
          task_id: "task-42",
          full_session: true,
        });

        expect(result).toContain("completed");
        expect(result).toContain("final answer");
      });
    });
  });
});
