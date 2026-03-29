import { describe, it, expect, beforeEach } from "bun:test";
import type { ToolDefinition } from "@opencode-ai/plugin";
import { taskCreateTool } from "./handler";
import { resetTaskStore, taskStore } from "../storage";

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

describe("taskCreateTool", () => {
  beforeEach(() => {
    resetTaskStore();
  });

  describe("#given valid input", () => {
    describe("#when called with subject only", () => {
      it("#then creates a task with default status and priority", async () => {
        const result = await taskCreateTool.execute({ subject: "Fix the bug" }, mockContext);
        expect(result).toContain("subject: Fix the bug");
        expect(result).toContain("status: pending");
        expect(result).toContain("priority: medium");
        expect(result).toMatch(/^id: task-/m);
      });
    });

    describe("#when called with all fields", () => {
      it("#then creates a task with the specified values", async () => {
        const result = await taskCreateTool.execute(
          { subject: "Deploy", content: "Deploy v2", priority: "high", status: "in_progress" },
          mockContext,
        );
        expect(result).toContain("subject: Deploy");
        expect(result).toContain("content: Deploy v2");
        expect(result).toContain("priority: high");
        expect(result).toContain("status: in_progress");
      });
    });

    describe("#when a task is created", () => {
      it("#then sets createdAt and updatedAt timestamps and stores the task", async () => {
        const result = await taskCreateTool.execute({ subject: "Timestamp test" }, mockContext);
        expect(result).toContain("createdAt:");
        expect(result).toContain("updatedAt:");
        expect(taskStore.size).toBe(1);
      });
    });
  });

  describe("#given invalid input", () => {
    describe("#when subject is missing", () => {
      it("#then returns a validation error", async () => {
        const result = await taskCreateTool.execute({}, mockContext);
        expect(result).toContain("Error:");
      });
    });
  });
});
