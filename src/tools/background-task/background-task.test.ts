import { describe, it, expect, mock, beforeEach } from "bun:test"
import type { BackgroundTask } from "../../features/background-agent/types"
import type { BackgroundAgentManager } from "../../features/background-agent/manager"
import type { OpenCodeContext } from "../../types/plugin"
import { handleBackgroundOutput } from "./output/handler"
import { handleBackgroundCancel } from "./cancel/handler"

function makeTask(overrides: Partial<BackgroundTask> = {}): BackgroundTask {
  return {
    id: "task-1",
    status: "running",
    prompt: "do something",
    model: "claude-3",
    createdAt: Date.now() - 5000,
    startedAt: Date.now() - 4000,
    ...overrides,
  }
}

function makeManager(task: BackgroundTask | undefined): BackgroundAgentManager {
  return {
    get: mock((_id: string) => task),
    getAll: mock(() => (task ? [task] : [])),
    cancel: mock(async (_ctx: OpenCodeContext, _id: string) => {}),
    launch: mock(async () => task!),
    complete: mock(() => {}),
    fail: mock(() => {}),
  } as unknown as BackgroundAgentManager
}

const mockCtx = {
  client: {},
  directory: "/tmp",
  worktree: "/tmp",
} as unknown as OpenCodeContext

describe("handleBackgroundOutput", () => {
  describe("#given task not found", () => {
    describe("#when called with unknown task_id", () => {
      it("#then returns not found message", async () => {
        const manager = makeManager(undefined)
        const result = await handleBackgroundOutput(manager, { task_id: "missing" })
        expect(result).toContain("Task not found: missing")
      })
    })
  })

  describe("#given a running task", () => {
    describe("#when called without block", () => {
      it("#then returns running status with elapsed time", async () => {
        const task = makeTask({ status: "running", startedAt: Date.now() - 3000 })
        const manager = makeManager(task)
        const result = await handleBackgroundOutput(manager, { task_id: "task-1" })
        expect(result).toContain("task-1")
        expect(result).toContain("running")
        expect(result).toContain("elapsed")
      })
    })
  })

  describe("#given a queued task", () => {
    describe("#when called without block", () => {
      it("#then returns queued status message", async () => {
        const task = makeTask({ status: "queued", startedAt: undefined })
        const manager = makeManager(task)
        const result = await handleBackgroundOutput(manager, { task_id: "task-1" })
        expect(result).toContain("queued")
      })
    })
  })

  describe("#given a completed task", () => {
    describe("#when called", () => {
      it("#then returns completed result", async () => {
        const task = makeTask({ status: "completed", result: "the answer is 42" })
        const manager = makeManager(task)
        const result = await handleBackgroundOutput(manager, { task_id: "task-1" })
        expect(result).toContain("completed")
        expect(result).toContain("the answer is 42")
      })
    })
  })

  describe("#given a failed task", () => {
    describe("#when called", () => {
      it("#then returns failed error message", async () => {
        const task = makeTask({ status: "failed", error: "out of memory" })
        const manager = makeManager(task)
        const result = await handleBackgroundOutput(manager, { task_id: "task-1" })
        expect(result).toContain("failed")
        expect(result).toContain("out of memory")
      })
    })
  })

  describe("#given a cancelled task", () => {
    describe("#when called", () => {
      it("#then returns cancelled message", async () => {
        const task = makeTask({ status: "cancelled" })
        const manager = makeManager(task)
        const result = await handleBackgroundOutput(manager, { task_id: "task-1" })
        expect(result).toContain("cancelled")
      })
    })
  })
})

describe("handleBackgroundCancel", () => {
  describe("#given no task_id and all=false", () => {
    describe("#when called with invalid args", () => {
      it("#then returns error message", async () => {
        const manager = makeManager(undefined)
        const result = await handleBackgroundCancel(manager, mockCtx, {})
        expect(result).toContain("[ERROR]")
        expect(result).toContain("task_id")
      })
    })
  })

  describe("#given task not found", () => {
    describe("#when called with unknown task_id", () => {
      it("#then returns not found error", async () => {
        const manager = makeManager(undefined)
        const result = await handleBackgroundCancel(manager, mockCtx, { task_id: "ghost" })
        expect(result).toContain("[ERROR]")
        expect(result).toContain("ghost")
      })
    })
  })

  describe("#given a completed task", () => {
    describe("#when cancel is called", () => {
      it("#then returns cannot cancel error", async () => {
        const task = makeTask({ status: "completed" })
        const manager = makeManager(task)
        const result = await handleBackgroundCancel(manager, mockCtx, { task_id: "task-1" })
        expect(result).toContain("[ERROR]")
        expect(result).toContain("completed")
      })
    })
  })

  describe("#given a running task", () => {
    describe("#when cancel is called", () => {
      it("#then cancels and returns success message", async () => {
        const task = makeTask({ status: "running" })
        const manager = makeManager(task)
        const result = await handleBackgroundCancel(manager, mockCtx, { task_id: "task-1" })
        expect(result).toContain("cancelled successfully")
        expect(manager.cancel).toHaveBeenCalledWith(mockCtx, "task-1")
      })
    })
  })

  describe("#given multiple running tasks and all=true", () => {
    describe("#when cancel all is called", () => {
      it("#then cancels all and returns count", async () => {
        const task1 = makeTask({ id: "task-1", status: "running" })
        const task2 = makeTask({ id: "task-2", status: "queued" })
        const manager = {
          get: mock((_id: string) => task1),
          getAll: mock(() => [task1, task2]),
          cancel: mock(async () => {}),
          launch: mock(async () => task1),
          complete: mock(() => {}),
          fail: mock(() => {}),
        } as unknown as BackgroundAgentManager

        const result = await handleBackgroundCancel(manager, mockCtx, { all: true })
        expect(result).toContain("Cancelled 2")
        expect(manager.cancel).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe("#given no running tasks and all=true", () => {
    describe("#when cancel all is called", () => {
      it("#then returns no tasks message", async () => {
        const task = makeTask({ status: "completed" })
        const manager = makeManager(task)
        const result = await handleBackgroundCancel(manager, mockCtx, { all: true })
        expect(result).toContain("No running or queued")
      })
    })
  })
})
