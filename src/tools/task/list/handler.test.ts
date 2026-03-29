import { describe, it, expect, beforeEach } from "bun:test";
import type { ToolDefinition } from "@opencode-ai/plugin";
import { taskListTool } from "./handler";
import { resetTaskStore, taskStore, generateTaskId } from "../storage";
import type { Task } from "../types";

const mockContext = {
  sessionID: "ses_test",
  messageID: "msg_test",
  agent: "test-agent",
  directory: "/tmp",
  worktree: "/tmp",
  abort: new AbortController().signal,
  metadata: () => {},
  ask: async () => {},
} satisfies Parameters<ToolDefinition["execute"]>[1];

function addTask(overrides: Partial<Task> = {}): Task {
  const now = Date.now();
  const task: Task = {
    id: generateTaskId(),
    subject: "Default task",
    status: "pending",
    priority: "medium",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
  taskStore.set(task.id, task);
  return task;
}

describe("taskListTool", () => {
  beforeEach(() => {
    resetTaskStore();
  });

  describe("#given no tasks exist", () => {
    describe("#when called", () => {
      it("#then returns no tasks found message", async () => {
        const result = await taskListTool.execute({}, mockContext);
        expect(result).toBe("No tasks found.");
      });
    });
  });

  describe("#given tasks exist with different statuses", () => {
    describe("#when filtering by status", () => {
      it("#then returns only tasks matching that status", async () => {
        addTask({ subject: "Pending task", status: "pending" });
        addTask({ subject: "Completed task", status: "completed" });
        const result = await taskListTool.execute({ status: "pending" }, mockContext);
        expect(result).toContain("Pending task");
        expect(result).not.toContain("Completed task");
      });
    });
  });

  describe("#given tasks exist with different priorities", () => {
    describe("#when filtering by priority", () => {
      it("#then returns only tasks matching that priority", async () => {
        addTask({ subject: "High prio", priority: "high" });
        addTask({ subject: "Low prio", priority: "low" });
        const result = await taskListTool.execute({ priority: "high" }, mockContext);
        expect(result).toContain("High prio");
        expect(result).not.toContain("Low prio");
      });
    });
  });
});
