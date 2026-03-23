import type { PluginHookContributions } from "../../types/hook"
import { log } from "../../shared/logger"
import { computeLineHash } from "../../tools/hashline-edit/hash-computation"

const STALE_TIMEOUT_MS = 5 * 60 * 1000

type BeforeInput = { tool: string; sessionID: string; callID: string }
type BeforeOutput = { args: Record<string, unknown> }
type AfterInput = { tool: string; sessionID: string; callID: string }
type AfterOutput = { title: string; output: string; metadata: Record<string, unknown> }

type PreToolUseHook = NonNullable<PluginHookContributions["tool.execute.before"]>
type PostToolUseHook = NonNullable<PluginHookContributions["tool.execute.after"]>

interface PendingCapture {
  content: string
  filePath: string
  storedAt: number
}

const pendingCaptures = new Map<string, PendingCapture>()

function makeKey(sessionID: string, callID: string): string {
  return `${sessionID}:${callID}`
}

function cleanupStaleEntries(): void {
  const now = Date.now()
  for (const [key, entry] of pendingCaptures) {
    if (now - entry.storedAt > STALE_TIMEOUT_MS) {
      pendingCaptures.delete(key)
    }
  }
}

function isWriteTool(toolName: string): boolean {
  return toolName.toLowerCase() === "write"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function extractFilePath(args: Record<string, unknown>): string | undefined {
  const path = args.path ?? args.filePath ?? args.file_path
  return typeof path === "string" ? path : undefined
}

async function captureOldContent(filePath: string): Promise<string> {
  try {
    const file = Bun.file(filePath)
    if (await file.exists()) {
      return await file.text()
    }
  } catch {
    log("[hashline-diff-enhancer] failed to read old content", { filePath })
  }
  return ""
}

function toHashlineContent(content: string): string {
  if (!content) return content
  const lines = content.split("\n")
  const lastLine = lines[lines.length - 1]
  const hasTrailingNewline = lastLine === ""
  const contentLines = hasTrailingNewline ? lines.slice(0, -1) : lines
  const hashlined = contentLines.map((line, i) => {
    const lineNum = i + 1
    const hash = computeLineHash(lineNum, line)
    return `${lineNum}#${hash}|${line}`
  })
  return hasTrailingNewline ? hashlined.join("\n") + "\n" : hashlined.join("\n")
}

function buildSimpleDiff(oldContent: string, newContent: string, filePath: string): string {
  const oldLines = oldContent.split("\n")
  const newLines = newContent.split("\n")

  const oldSet = new Map<string, number>()
  for (const line of oldLines) {
    oldSet.set(line, (oldSet.get(line) ?? 0) + 1)
  }

  const newSet = new Map<string, number>()
  for (const line of newLines) {
    newSet.set(line, (newSet.get(line) ?? 0) + 1)
  }

  let deletions = 0
  for (const [line, count] of oldSet) {
    const newCount = newSet.get(line) ?? 0
    if (count > newCount) deletions += count - newCount
  }

  let additions = 0
  for (const [line, count] of newSet) {
    const oldCount = oldSet.get(line) ?? 0
    if (count > oldCount) additions += count - oldCount
  }

  return `--- ${filePath}\n+++ ${filePath}\n@@ -${oldLines.length} lines +${newLines.length} lines @@\n+${additions} additions, -${deletions} deletions`
}

export function createHashlineDiffEnhancerBeforeHandler(): PreToolUseHook {
  return async (input: unknown, output: unknown) => {
    if (!isRecord(input) || !isRecord(output)) return

    const tool = input.tool
    if (typeof tool !== "string" || !isWriteTool(tool)) return

    const args = output.args
    if (!isRecord(args)) return

    const filePath = extractFilePath(args)
    if (!filePath) return

    cleanupStaleEntries()
    const oldContent = await captureOldContent(filePath)
    pendingCaptures.set(makeKey(input.sessionID as string, input.callID as string), {
      content: oldContent,
      filePath,
      storedAt: Date.now(),
    })
  }
}

export function createHashlineDiffEnhancerAfterHandler(): PostToolUseHook {
  return async (input: unknown, output: unknown) => {
    if (!isRecord(input) || !isRecord(output)) return

    const tool = input.tool
    if (typeof tool !== "string" || !isWriteTool(tool)) return

    const key = makeKey(input.sessionID as string, input.callID as string)
    const captured = pendingCaptures.get(key)
    if (!captured) return
    pendingCaptures.delete(key)

    const { content: oldContent, filePath } = captured

    let newContent: string
    try {
      newContent = await Bun.file(filePath).text()
    } catch {
      log("[hashline-diff-enhancer] failed to read new content", { filePath })
      return
    }

    const metadata = output.metadata
    if (!isRecord(metadata)) return

    const diff = buildSimpleDiff(oldContent, newContent, filePath)
    const hashlinedNew = toHashlineContent(newContent)

    metadata.filediff = {
      file: filePath,
      path: filePath,
      before: oldContent,
      after: newContent,
    }
    metadata.diff = diff
    metadata.hashlined = hashlinedNew

    output.title = filePath as string
  }
}

export function createHashlineDiffEnhancerHandlers(): {
  before: PreToolUseHook
  after: PostToolUseHook
} {
  return {
    before: createHashlineDiffEnhancerBeforeHandler(),
    after: createHashlineDiffEnhancerAfterHandler(),
  }
}

export type { BeforeInput, BeforeOutput, AfterInput, AfterOutput }
