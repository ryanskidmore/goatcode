import { describe, it, expect, mock } from "bun:test";
import type { BackgroundTask, BackgroundAgentManager } from "../../../runtime";
import type { OpenCodeContext } from "../../../types/plugin";
import { handleBackgroundCancel } from "./handler";

function makeTask(overrides: Partial<BackgroundTask> = {}): BackgroundTask {
  return {
    id: "task-99",
    status: "running",
    prompt: "do work",
    model: "claude-3",
    createdAt: Date.now() - 5000,
    startedAt: Date.now() - 4000,
    ...overrides,
  };
}

function makeManager(task: BackgroundTask | undefined): BackgroundAgentManager {
  return {
    get: mock((_id: string) => task),
    getAll: mock(() => (task ? [task] : [])),
    cancel: mock(async (_ctx: OpenCodeContext, _id: string) => {}),
    launch: mock(async () => task!),
    complete: mock(() => {}),
    fail: mock(() => {}),
  } as unknown as BackgroundAgentManager;
}

const mockCtx = {
  client: {},
  directory: "/tmp",
  worktree: "/tmp",
} as unknown as OpenCodeContext;

describe("handleBackgroundCancel", () => {
  describe("#given a specific running task", () => {
    describe("#when cancel is called with task_id", () => {
      it("#then cancels the task and returns success", async () => {
        const task = makeTask({ id: "task-99", status: "running" });
        const manager = makeManager(task);

        const result = await handleBackgroundCancel(manager, mockCtx, { task_id: "task-99" });

        expect(result).toContain("cancelled successfully");
        expect(manager.cancel).toHaveBeenCalledWith(mockCtx, "task-99");
      });
    });
  });

  describe("#given all=true with multiple cancellable tasks", () => {
    describe("#when cancel all is called", () => {
      it("#then cancels all running/queued tasks", async () => {
        const task1 = makeTask({ id: "task-a", status: "running" });
        const task2 = makeTask({ id: "task-b", status: "queued" });
        const task3 = makeTask({ id: "task-c", status: "completed" });
        const manager = {
          get: mock((_id: string) => task1),
          getAll: mock(() => [task1, task2, task3]),
          cancel: mock(async () => {}),
          launch: mock(async () => task1),
          complete: mock(() => {}),
          fail: mock(() => {}),
        } as unknown as BackgroundAgentManager;

        const result = await handleBackgroundCancel(manager, mockCtx, { all: true });

        expect(result).toContain("Cancelled 2");
        expect(manager.cancel).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("#given neither task_id nor all provided", () => {
    describe("#when called with empty args", () => {
      it("#then returns validation error", async () => {
        const manager = makeManager(undefined);

        const result = await handleBackgroundCancel(manager, mockCtx, {});

        expect(result).toContain("[ERROR]");
        expect(result).toContain("task_id");
      });
    });
  });

  describe("#given a nonexistent task", () => {
    describe("#when cancel is called with unknown task_id", () => {
      it("#then returns task not found error", async () => {
        const manager = makeManager(undefined);

        const result = await handleBackgroundCancel(manager, mockCtx, { task_id: "ghost-task" });

        expect(result).toContain("[ERROR]");
        expect(result).toContain("ghost-task");
      });
    });
  });

  describe("#given a completed task", () => {
    describe("#when cancel is called on it", () => {
      it("#then returns cannot cancel error with current status", async () => {
        const task = makeTask({ id: "task-99", status: "completed" });
        const manager = makeManager(task);

        const result = await handleBackgroundCancel(manager, mockCtx, { task_id: "task-99" });

        expect(result).toContain("[ERROR]");
        expect(result).toContain("completed");
        expect(manager.cancel).not.toHaveBeenCalled();
      });
    });
  });

  describe("#given all=true with no cancellable tasks", () => {
    describe("#when all tasks are already completed", () => {
      it("#then returns no tasks message", async () => {
        const task = makeTask({ status: "completed" });
        const manager = makeManager(task);

        const result = await handleBackgroundCancel(manager, mockCtx, { all: true });

        expect(result).toContain("No running or queued");
        expect(manager.cancel).not.toHaveBeenCalled();
      });
    });
  });

  describe("#given a queued task", () => {
    describe("#when cancel is called", () => {
      it("#then cancels the queued task successfully", async () => {
        const task = makeTask({ id: "task-99", status: "queued" });
        const manager = makeManager(task);

        const result = await handleBackgroundCancel(manager, mockCtx, { task_id: "task-99" });

        expect(result).toContain("cancelled successfully");
        expect(manager.cancel).toHaveBeenCalledWith(mockCtx, "task-99");
      });
    });
  });

  describe("#given scoped cancellation with caller context", () => {
    describe("#when root agent (depth=0) calls cancel all", () => {
      it("#then cancels ALL running/queued tasks globally", async () => {
        const taskA = makeTask({
          id: "task-a",
          status: "running",
          parentSessionID: "ses-parent-1",
        });
        const taskB = makeTask({
          id: "task-b",
          status: "running",
          parentSessionID: "ses-parent-2",
        });
        const manager = {
          get: mock((_id: string) => taskA),
          getAll: mock(() => [taskA, taskB]),
          cancel: mock(async () => {}),
          launch: mock(async () => taskA),
          complete: mock(() => {}),
          fail: mock(() => {}),
        } as unknown as BackgroundAgentManager;

        const result = await handleBackgroundCancel(
          manager,
          mockCtx,
          { all: true },
          {
            callerSessionID: "ses-root",
            delegationDepth: 0,
          },
        );

        expect(result).toContain("Cancelled 2");
        expect(manager.cancel).toHaveBeenCalledTimes(2);
      });
    });

    describe("#when depth-1 agent calls cancel all", () => {
      it("#then only cancels tasks spawned by that agent", async () => {
        const ownChild = makeTask({
          id: "task-own",
          status: "running",
          parentSessionID: "ses-depth1",
        });
        const siblingChild = makeTask({
          id: "task-sibling",
          status: "running",
          parentSessionID: "ses-other",
        });
        const manager = {
          get: mock((_id: string) => ownChild),
          getAll: mock(() => [ownChild, siblingChild]),
          cancel: mock(async () => {}),
          launch: mock(async () => ownChild),
          complete: mock(() => {}),
          fail: mock(() => {}),
        } as unknown as BackgroundAgentManager;

        const result = await handleBackgroundCancel(
          manager,
          mockCtx,
          { all: true },
          {
            callerSessionID: "ses-depth1",
            delegationDepth: 1,
          },
        );

        expect(result).toContain("Cancelled 1");
        expect(manager.cancel).toHaveBeenCalledTimes(1);
        expect(manager.cancel).toHaveBeenCalledWith(mockCtx, "task-own");
      });
    });

    describe("#when depth-1 agent has no children to cancel", () => {
      it("#then returns no cancellable tasks message", async () => {
        const siblingChild = makeTask({
          id: "task-sibling",
          status: "running",
          parentSessionID: "ses-other",
        });
        const manager = {
          get: mock((_id: string) => siblingChild),
          getAll: mock(() => [siblingChild]),
          cancel: mock(async () => {}),
          launch: mock(async () => siblingChild),
          complete: mock(() => {}),
          fail: mock(() => {}),
        } as unknown as BackgroundAgentManager;

        const result = await handleBackgroundCancel(
          manager,
          mockCtx,
          { all: true },
          {
            callerSessionID: "ses-lonely",
            delegationDepth: 1,
          },
        );

        expect(result).toContain("No cancellable background tasks found for this agent");
        expect(manager.cancel).not.toHaveBeenCalled();
      });
    });

    describe("#when no caller context is provided", () => {
      it("#then defaults to global cancel (backward compatibility)", async () => {
        const taskA = makeTask({ id: "task-a", status: "running" });
        const taskB = makeTask({ id: "task-b", status: "queued" });
        const manager = {
          get: mock((_id: string) => taskA),
          getAll: mock(() => [taskA, taskB]),
          cancel: mock(async () => {}),
          launch: mock(async () => taskA),
          complete: mock(() => {}),
          fail: mock(() => {}),
        } as unknown as BackgroundAgentManager;

        const result = await handleBackgroundCancel(manager, mockCtx, { all: true });

        expect(result).toContain("Cancelled 2");
        expect(manager.cancel).toHaveBeenCalledTimes(2);
      });
    });
  });
});
