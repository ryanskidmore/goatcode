import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import { mkdirSync, existsSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { saveBoulderState, loadBoulderState, clearBoulderState } from "./boulder-state"
import type { BoulderState } from "./boulder-state"

const TEST_DIR = join(tmpdir(), "boulder-state-test-" + Date.now())

beforeEach(() => {
  if (!existsSync(TEST_DIR)) {
    mkdirSync(TEST_DIR, { recursive: true })
  }
})

afterEach(async () => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true })
  }
})

describe("boulder-state", () => {
  describe("#given no boulder-state.json exists", () => {
    describe("#when loadBoulderState is called", () => {
      it("#then returns undefined", async () => {
        const result = await loadBoulderState(TEST_DIR)
        expect(result).toBeUndefined()
      })
    })

    describe("#when clearBoulderState is called", () => {
      it("#then resolves without error", async () => {
        await expect(clearBoulderState(TEST_DIR)).resolves.toBeUndefined()
      })
    })
  })

  describe("#given a valid BoulderState", () => {
    const state: BoulderState = {
      planName: "wave6-features",
      currentTask: "Task 48: Boulder State Tracking",
      completedTasks: ["Task 1", "Task 2"],
      notes: "Implementation in progress",
      updatedAt: 1700000000000,
    }

    describe("#when saveBoulderState is called", () => {
      it("#then loadBoulderState returns the saved state", async () => {
        await saveBoulderState(TEST_DIR, state)
        const loaded = await loadBoulderState(TEST_DIR)

        expect(loaded).toBeDefined()
        expect(loaded?.planName).toBe("wave6-features")
        expect(loaded?.currentTask).toBe("Task 48: Boulder State Tracking")
        expect(loaded?.completedTasks).toEqual(["Task 1", "Task 2"])
        expect(loaded?.notes).toBe("Implementation in progress")
        expect(loaded?.updatedAt).toBe(1700000000000)
      })

      it("#then persists to .sisyphus/boulder-state.json", async () => {
        await saveBoulderState(TEST_DIR, state)
        const expectedPath = join(TEST_DIR, ".sisyphus", "boulder-state.json")
        expect(existsSync(expectedPath)).toBe(true)
      })
    })

    describe("#when saveBoulderState then clearBoulderState is called", () => {
      it("#then loadBoulderState returns undefined", async () => {
        await saveBoulderState(TEST_DIR, state)
        await clearBoulderState(TEST_DIR)
        const result = await loadBoulderState(TEST_DIR)
        expect(result).toBeUndefined()
      })
    })
  })

  describe("#given a state is saved and then overwritten", () => {
    describe("#when saveBoulderState is called twice", () => {
      it("#then loadBoulderState returns the latest state", async () => {
        const first: BoulderState = {
          planName: "plan-a",
          currentTask: "task-1",
          completedTasks: [],
          notes: "",
          updatedAt: 1000,
        }
        const second: BoulderState = {
          planName: "plan-a",
          currentTask: "task-2",
          completedTasks: ["task-1"],
          notes: "task-1 done",
          updatedAt: 2000,
        }

        await saveBoulderState(TEST_DIR, first)
        await saveBoulderState(TEST_DIR, second)
        const loaded = await loadBoulderState(TEST_DIR)

        expect(loaded?.currentTask).toBe("task-2")
        expect(loaded?.completedTasks).toEqual(["task-1"])
        expect(loaded?.updatedAt).toBe(2000)
      })
    })
  })
})
