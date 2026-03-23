import { computeLineHash } from "./hash-computation"
import type { EditOperation, HashlineEdit, ParsedHashline } from "./types"

const HASHLINE_OLD_STRING_PATTERN = /^([0-9]+)#([ZPMQVRWSNKTXJBYH]{2})\|(.*)$/

function splitLines(content: string): { lines: string[]; trailingNewline: boolean } {
  if (content.length === 0) return { lines: [], trailingNewline: false }
  const normalized = content.replace(/\r/g, "")
  const trailingNewline = normalized.endsWith("\n")
  const lines = normalized.split("\n")
  if (trailingNewline) lines.pop()
  return { lines, trailingNewline }
}

function joinLines(lines: string[], trailingNewline: boolean): string {
  if (lines.length === 0) return ""
  const joined = lines.join("\n")
  return trailingNewline ? `${joined}\n` : joined
}

function parseOldString(oldString: string): ParsedHashline {
  const match = oldString.match(HASHLINE_OLD_STRING_PATTERN)
  if (!match) {
    throw new Error(`Invalid oldString format: "${oldString}". Expected "LINE#ID|content"`)
  }

  return {
    lineNumber: Number.parseInt(match[1], 10),
    hash: match[2],
    content: match[3],
  }
}

function lineDistance(a: number, b: number): number {
  return Math.abs(a - b)
}

function pickBestCandidate(candidates: number[], preferredLine: number): number {
  if (candidates.length === 1) return candidates[0]
  return [...candidates].sort((a, b) => lineDistance(a, preferredLine) - lineDistance(b, preferredLine))[0]
}

function resolveLineIndex(lines: string[], parsed: ParsedHashline, expectedHash: string): number {
  const candidates: number[] = []

  for (let i = 0; i < lines.length; i++) {
    if (lines[i] !== parsed.content) continue
    const actualHash = computeLineHash(i + 1, lines[i])
    if (actualHash === expectedHash) {
      candidates.push(i)
    }
  }

  if (candidates.length === 0) {
    throw new Error(
      `stale content: could not locate line matching hash ${expectedHash} and text "${parsed.content}"`
    )
  }

  return pickBestCandidate(candidates, parsed.lineNumber - 1)
}

export function planEditOperations(content: string, edits: HashlineEdit[]): EditOperation[] {
  const { lines } = splitLines(content)
  const operations: EditOperation[] = []
  const targetedLineIndexes = new Set<number>()

  for (let i = 0; i < edits.length; i++) {
    const edit = edits[i]
    const parsed = parseOldString(edit.oldString)

    if (parsed.hash !== edit.hash) {
      throw new Error(`stale content: hash mismatch for edit ${i} (oldString hash does not match hash field)`)
    }

    const lineIndex = resolveLineIndex(lines, parsed, edit.hash)
    if (targetedLineIndexes.has(lineIndex)) {
      throw new Error(`stale content: conflicting edits target the same line (${lineIndex + 1})`)
    }

    const actualHash = computeLineHash(lineIndex + 1, lines[lineIndex])
    if (actualHash !== edit.hash) {
      throw new Error(`stale content: expected hash ${edit.hash} but found ${actualHash}`)
    }

    targetedLineIndexes.add(lineIndex)
    operations.push({
      editIndex: i,
      lineIndex,
      newLines: edit.newString.split("\n"),
    })
  }

  return operations
}

export function applyEditOperations(content: string, operations: EditOperation[]): string {
  const { lines, trailingNewline } = splitLines(content)
  const sorted = [...operations].sort((a, b) => b.lineIndex - a.lineIndex)

  for (const operation of sorted) {
    lines.splice(operation.lineIndex, 1, ...operation.newLines)
  }

  return joinLines(lines, trailingNewline)
}

export function applyHashlineEdits(content: string, edits: HashlineEdit[]): string {
  const operations = planEditOperations(content, edits)
  return applyEditOperations(content, operations)
}
