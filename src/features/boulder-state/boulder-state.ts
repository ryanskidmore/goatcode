import { join } from "node:path"
import { unlink } from "node:fs/promises"
import { z } from "zod"
import { log } from "../../shared/logger"

const SISYPHUS_DIR = ".sisyphus"
const BOULDER_STATE_FILE = "boulder-state.json"

export interface BoulderState {
  planName: string
  currentTask: string
  completedTasks: string[]
  notes: string
  updatedAt: number
}

function getBoulderStatePath(directory: string): string {
  return join(directory, SISYPHUS_DIR, BOULDER_STATE_FILE)
}

const BoulderStateSchema = z.object({
  planName: z.string(),
  currentTask: z.string(),
  completedTasks: z.array(z.string()),
  notes: z.string(),
  updatedAt: z.number(),
})

export async function saveBoulderState(directory: string, state: BoulderState): Promise<void> {
  const filePath = getBoulderStatePath(directory)
  const sisyphusDir = join(directory, SISYPHUS_DIR)

  try {
    await Bun.write(join(sisyphusDir, ".keep"), "")
    await Bun.write(filePath, JSON.stringify(state, null, 2))
    log("boulder-state: saved", { planName: state.planName, currentTask: state.currentTask })
  } catch (err) {
    log("boulder-state: failed to save", { error: String(err) })
    throw err
  }
}

export async function loadBoulderState(directory: string): Promise<BoulderState | undefined> {
  const filePath = getBoulderStatePath(directory)

  try {
    const file = Bun.file(filePath)
    const exists = await file.exists()
    if (!exists) {
      return undefined
    }

    const parsed = await file.json()
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return undefined
    }

    const result = BoulderStateSchema.safeParse(parsed)
    if (!result.success) {
      log("boulder-state: invalid schema", { error: result.error.message })
      return undefined
    }
    return result.data
  } catch {
    return undefined
  }
}

export async function clearBoulderState(directory: string): Promise<void> {
  const filePath = getBoulderStatePath(directory)

  try {
    const file = Bun.file(filePath)
    const exists = await file.exists()
    if (!exists) {
      return
    }

    await unlink(filePath)
    log("boulder-state: cleared", { directory })
  } catch (err) {
    log("boulder-state: failed to clear", { error: String(err) })
    throw err
  }
}
