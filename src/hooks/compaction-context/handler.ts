import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { log } from "../../shared/logger"

type EventInput = {
  event?: {
    type?: string
    properties?: unknown
  }
}

type SessionLikeInput = {
  sessionID?: string
  session?: {
    id?: string
  }
}

type SystemTransformOutput = {
  system?: string
  prompt?: string
  text?: string
  content?: string
}

function readTextIfExists(path: string, maxChars = 4000): string | null {
  if (!existsSync(path)) {
    return null
  }

  try {
    const text = readFileSync(path, "utf8")
    return text.length > maxChars ? `${text.slice(0, maxChars)}\n\n[truncated]` : text
  } catch (error) {
    log("[compaction-context] Failed to read context file", { path, error: String(error) })
    return null
  }
}

function resolveLatestPlanPath(workspaceDirectory: string): string | null {
  const plansDirectory = join(workspaceDirectory, ".sisyphus", "plans")
  if (!existsSync(plansDirectory)) {
    return null
  }

  const planFiles = readdirSync(plansDirectory)
    .filter((name) => name.endsWith(".md"))
    .map((name) => ({
      path: join(plansDirectory, name),
      mtimeMs: statSync(join(plansDirectory, name)).mtimeMs,
    }))
    .sort((left, right) => right.mtimeMs - left.mtimeMs)

  return planFiles[0]?.path ?? null
}

function buildCompactionSnapshot(workspaceDirectory: string): string | null {
  const todoPaths = [
    join(workspaceDirectory, ".sisyphus", "todos.md"),
    join(workspaceDirectory, ".sisyphus", "todo.md"),
  ]

  const todoContent = todoPaths
    .map((path) => ({ path, content: readTextIfExists(path) }))
    .find((entry) => entry.content !== null)

  const planPath = resolveLatestPlanPath(workspaceDirectory)
  const planContent = planPath ? readTextIfExists(planPath) : null

  if (!todoContent?.content && !planContent) {
    return null
  }

  let snapshot = "[Compaction Recovery Context]\n"
  if (todoContent?.content) {
    snapshot += `\n## Current Todos\n[Source: ${todoContent.path}]\n${todoContent.content}\n`
  }
  if (planContent && planPath) {
    snapshot += `\n## Active Plan\n[Source: ${planPath}]\n${planContent}\n`
  }

  return snapshot
}

function resolveSessionID(properties: unknown): string | null {
  if (!properties || typeof properties !== "object") {
    return null
  }

  const record = properties as Record<string, unknown>
  const direct = record.sessionID
  if (typeof direct === "string") {
    return direct
  }

  const info = record.info
  if (info && typeof info === "object") {
    const id = (info as Record<string, unknown>).id
    if (typeof id === "string") {
      return id
    }
  }

  return null
}

export function createCompactionContextEventHandler(
  workspaceDirectory: string,
  sessionSnapshots: Map<string, string>,
) {
  return async (input: unknown): Promise<void> => {
    const typedInput = input as EventInput
    const eventType = typedInput.event?.type
    const properties = typedInput.event?.properties
    const sessionID = resolveSessionID(properties)

    if (!sessionID) {
      return
    }

    if (eventType === "session.deleted") {
      sessionSnapshots.delete(sessionID)
      return
    }

    if (eventType !== "session.compacted") {
      return
    }

    const snapshot = buildCompactionSnapshot(workspaceDirectory)
    if (!snapshot) {
      return
    }

    sessionSnapshots.set(sessionID, snapshot)
  }
}

export function createCompactionContextSystemTransformHandler(sessionSnapshots: Map<string, string>) {
  return async (input: unknown, output: unknown): Promise<void> => {
    const typedInput = input as SessionLikeInput
    const typedOutput = output as SystemTransformOutput
    const sessionID = typedInput.sessionID ?? typedInput.session?.id

    if (!sessionID) {
      return
    }

    const snapshot = sessionSnapshots.get(sessionID)
    if (!snapshot) {
      return
    }

    if (typeof typedOutput.system === "string") {
      typedOutput.system += `\n\n${snapshot}`
      sessionSnapshots.delete(sessionID)
      return
    }

    if (typeof typedOutput.prompt === "string") {
      typedOutput.prompt += `\n\n${snapshot}`
      sessionSnapshots.delete(sessionID)
      return
    }

    if (typeof typedOutput.text === "string") {
      typedOutput.text += `\n\n${snapshot}`
      sessionSnapshots.delete(sessionID)
      return
    }

    if (typeof typedOutput.content === "string") {
      typedOutput.content += `\n\n${snapshot}`
      sessionSnapshots.delete(sessionID)
    }
  }
}
