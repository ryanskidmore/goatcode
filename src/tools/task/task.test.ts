import { describe, it, expect, beforeEach } from "bun:test"
import type { ToolDefinition } from "@opencode-ai/plugin"
import { taskCreateTool } from "./create/handler"
import { taskListTool } from "./list/handler"
import { taskGetTool } from "./get/handler"
import { taskUpdateTool } from "./update/handler"
import { resetTaskStore } from "./storage"

const mockContext = {
  sessionID: "session-1",
  messageID: "message-1",
  agent: "agent-1",
  directory: "/tmp",
  worktree: "/tmp",
  abort: new AbortController().signal,
  metadata: () => {},
  ask: async () => {},
} satisfies Parameters<ToolDefinition["execute"]>[1]

function extractId(output: string): string {
  const match = output.match(/^id: (.+)$/m)
  if (!match) throw new Error(`Could not extract id from: ${output}`)
  return match[1]
}

describe("task tools", () => {
  beforeEach(() => {
    resetTaskStore()
  })

  describe("#given no tasks exist", () => {
    describe("#when task_list is called", () => {
      it("#then it returns no tasks found message", async () => {
        const result = await taskListTool.execute({}, mockContext)
        expect(result).toBe("No tasks found.")
      })
    })

    describe("#when task_get is called with a non-existent id", () => {
      it("#then it returns an error message", async () => {
        const result = await taskGetTool.execute({ id: "task-does-not-exist" }, mockContext)
        expect(result).toContain("Error: task not found")
      })
    })
  })

  describe("#given a task is created", () => {
    describe("#when task_create is called with subject only", () => {
      it("#then it returns the created task with default status and priority", async () => {
        const result = await taskCreateTool.execute({ subject: "Fix the bug" }, mockContext)
        expect(result).toContain("subject: Fix the bug")
        expect(result).toContain("status: pending")
        expect(result).toContain("priority: medium")
        expect(result).toMatch(/^id: task-/m)
      })
    })

    describe("#when task_create is called with all fields", () => {
      it("#then it returns the created task with all specified fields", async () => {
        const result = await taskCreateTool.execute(
          { subject: "Deploy service", content: "Deploy to prod", priority: "high", status: "in_progress" },
          mockContext,
        )
        expect(result).toContain("subject: Deploy service")
        expect(result).toContain("content: Deploy to prod")
        expect(result).toContain("priority: high")
        expect(result).toContain("status: in_progress")
      })
    })
  })

  describe("#given a task exists in the store", () => {
    describe("#when task_list is called without filters", () => {
      it("#then it returns the task in the list", async () => {
        await taskCreateTool.execute({ subject: "Write tests" }, mockContext)
        const result = await taskListTool.execute({}, mockContext)
        expect(result).toContain("Write tests")
      })
    })

    describe("#when task_list is called with a matching status filter", () => {
      it("#then it returns only tasks with that status", async () => {
        await taskCreateTool.execute({ subject: "Task A", status: "pending" }, mockContext)
        await taskCreateTool.execute({ subject: "Task B", status: "completed" }, mockContext)
        const result = await taskListTool.execute({ status: "pending" }, mockContext)
        expect(result).toContain("Task A")
        expect(result).not.toContain("Task B")
      })
    })

    describe("#when task_list is called with a matching priority filter", () => {
      it("#then it returns only tasks with that priority", async () => {
        await taskCreateTool.execute({ subject: "High prio", priority: "high" }, mockContext)
        await taskCreateTool.execute({ subject: "Low prio", priority: "low" }, mockContext)
        const result = await taskListTool.execute({ priority: "high" }, mockContext)
        expect(result).toContain("High prio")
        expect(result).not.toContain("Low prio")
      })
    })

    describe("#when task_get is called with the task id", () => {
      it("#then it returns the full task details", async () => {
        const created = await taskCreateTool.execute(
          { subject: "Review PR", content: "Check the diff", priority: "low" },
          mockContext,
        )
        const id = extractId(created)
        const result = await taskGetTool.execute({ id }, mockContext)
        expect(result).toContain(`id: ${id}`)
        expect(result).toContain("subject: Review PR")
        expect(result).toContain("content: Check the diff")
        expect(result).toContain("priority: low")
      })
    })
  })

  describe("#given the full CRUD lifecycle", () => {
    describe("#when create -> list -> update -> get is performed", () => {
      it("#then the task reflects all changes at each step", async () => {
        const created = await taskCreateTool.execute(
          { subject: "Implement feature", priority: "medium" },
          mockContext,
        )
        expect(created).toContain("status: pending")
        const id = extractId(created)

        const listed = await taskListTool.execute({}, mockContext)
        expect(listed).toContain("Implement feature")

        const updated = await taskUpdateTool.execute({ id, status: "completed" }, mockContext)
        expect(updated).toContain("status: completed")

        const fetched = await taskGetTool.execute({ id }, mockContext)
        expect(fetched).toContain("status: completed")
        expect(fetched).toContain("subject: Implement feature")
      })
    })
  })

  describe("#given a task update with unknown id", () => {
    describe("#when task_update is called", () => {
      it("#then it returns an error message", async () => {
        const result = await taskUpdateTool.execute({ id: "task-unknown", status: "completed" }, mockContext)
        expect(result).toContain("Error: task not found")
      })
    })
  })

  describe("#given task_create is called without subject", () => {
    describe("#when subject is missing", () => {
      it("#then it returns a validation error", async () => {
        const result = await taskCreateTool.execute({}, mockContext)
        expect(result).toContain("Error:")
      })
    })
  })
})
