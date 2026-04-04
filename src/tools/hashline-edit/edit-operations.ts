import { computeLineHash } from "./hash-computation";
import { HASHLINE_TOLERANT_REF_PATTERN } from "./constants";
import type { Anchor, HashlineEdit, HashlineApplyReport, RawHashlineEdit } from "./types";

/**
 * Parse a line reference string like "5#VK" into structured form.
 * Tolerant: strips leading >+- markers, flexible whitespace, ignores trailing content.
 */
export function parseTag(ref: string): Anchor {
  const match = ref.match(HASHLINE_TOLERANT_REF_PATTERN);
  if (!match) {
    throw new Error(`Invalid line reference "${ref}". Expected format "LINE#HASH" (e.g. "5#VK").`);
  }
  const line = Number.parseInt(match[1], 10);
  if (line < 1) {
    throw new Error(`Line number must be >= 1, got ${line} in "${ref}".`);
  }
  return { line, hash: match[2] };
}

/**
 * Normalize raw lines input to a string array.
 * Handles string (split by newlines), string[], and null (empty array for deletion).
 */
function normalizeLines(lines: string | string[] | null | undefined): string[] {
  if (lines === null || lines === undefined) return [];
  if (Array.isArray(lines)) return lines;
  return lines.split("\n");
}

/**
 * Normalize a raw edit from the tool boundary into a typed internal edit.
 */
export function normalizeEdit(raw: RawHashlineEdit, index: number): HashlineEdit {
  switch (raw.op) {
    case "replace_line": {
      if (!raw.pos) throw new Error(`Edit ${index}: replace_line requires pos anchor`);
      return { op: "replace_line", pos: parseTag(raw.pos), lines: normalizeLines(raw.lines) };
    }
    case "replace_range": {
      if (!raw.pos) throw new Error(`Edit ${index}: replace_range requires pos anchor`);
      if (!raw.end) throw new Error(`Edit ${index}: replace_range requires end anchor`);
      const pos = parseTag(raw.pos);
      const end = parseTag(raw.end);
      if (pos.line > end.line) {
        throw new Error(
          `Edit ${index}: range start line ${pos.line} must be <= end line ${end.line}`,
        );
      }
      return { op: "replace_range", pos, end, lines: normalizeLines(raw.lines) };
    }
    case "append_at": {
      if (!raw.pos) throw new Error(`Edit ${index}: append_at requires pos anchor`);
      return { op: "append_at", pos: parseTag(raw.pos), lines: normalizeLines(raw.lines) };
    }
    case "prepend_at": {
      if (!raw.pos) throw new Error(`Edit ${index}: prepend_at requires pos anchor`);
      return { op: "prepend_at", pos: parseTag(raw.pos), lines: normalizeLines(raw.lines) };
    }
    case "append_file": {
      return { op: "append_file", lines: normalizeLines(raw.lines) };
    }
    case "prepend_file": {
      return { op: "prepend_file", lines: normalizeLines(raw.lines) };
    }
    default:
      throw new Error(
        `Edit ${index}: unsupported op "${String(raw.op)}". Use replace_line, replace_range, append_at, prepend_at, append_file, or prepend_file.`,
      );
  }
}

interface HashMismatch {
  line: number;
  expected: string;
}

const MISMATCH_CONTEXT = 2;

export class HashlineMismatchError extends Error {
  readonly remaps: ReadonlyMap<string, string>;

  constructor(
    readonly mismatches: HashMismatch[],
    readonly fileLines: string[],
  ) {
    super(HashlineMismatchError.formatMessage(mismatches, fileLines));
    this.name = "HashlineMismatchError";
    const remaps = new Map<string, string>();
    for (const m of mismatches) {
      const actual = computeLineHash(m.line, fileLines[m.line - 1] ?? "");
      remaps.set(`${m.line}#${m.expected}`, `${m.line}#${actual}`);
    }
    this.remaps = remaps;
  }

  static formatMessage(mismatches: HashMismatch[], fileLines: string[]): string {
    const mismatchByLine = new Map<number, HashMismatch>();
    for (const m of mismatches) mismatchByLine.set(m.line, m);

    const displayLines = new Set<number>();
    for (const m of mismatches) {
      const low = Math.max(1, m.line - MISMATCH_CONTEXT);
      const high = Math.min(fileLines.length, m.line + MISMATCH_CONTEXT);
      for (let line = low; line <= high; line++) displayLines.add(line);
    }

    const sortedLines = [...displayLines].sort((a, b) => a - b);
    const output: string[] = [];
    output.push(
      `${mismatches.length} line${mismatches.length > 1 ? "s have" : " has"} changed since last read. ` +
        "Use updated LINE#HASH references below (>>> marks changed lines).",
    );
    output.push("");

    let previousLine = -1;
    for (const line of sortedLines) {
      if (previousLine !== -1 && line > previousLine + 1) {
        output.push("    ...");
      }
      previousLine = line;

      const content = fileLines[line - 1] ?? "";
      const hash = computeLineHash(line, content);
      const prefix = `${line}#${hash}|${content}`;
      if (mismatchByLine.has(line)) {
        output.push(`>>> ${prefix}`);
      } else {
        output.push(`    ${prefix}`);
      }
    }

    return output.join("\n");
  }
}

function validateRef(ref: Anchor, fileLines: string[], mismatches: HashMismatch[]): boolean {
  if (ref.line < 1 || ref.line > fileLines.length) {
    throw new Error(`Line ${ref.line} does not exist (file has ${fileLines.length} lines)`);
  }
  const actualHash = computeLineHash(ref.line, fileLines[ref.line - 1]);
  if (actualHash === ref.hash) return true;
  mismatches.push({ line: ref.line, expected: ref.hash });
  return false;
}

function getEditSortKey(
  edit: HashlineEdit,
  fileLineCount: number,
): { sortLine: number; precedence: number } {
  switch (edit.op) {
    case "replace_line":
      return { sortLine: edit.pos.line, precedence: 0 };
    case "replace_range":
      return { sortLine: edit.end.line, precedence: 0 };
    case "append_at":
      return { sortLine: edit.pos.line, precedence: 1 };
    case "prepend_at":
      return { sortLine: edit.pos.line, precedence: 2 };
    case "append_file":
      return { sortLine: fileLineCount + 1, precedence: 1 };
    case "prepend_file":
      return { sortLine: 0, precedence: 2 };
  }
}

function getDeduplicationKey(edit: HashlineEdit): string {
  switch (edit.op) {
    case "replace_line":
      return `rl:${edit.pos.line}:${edit.lines.join("\n")}`;
    case "replace_range":
      return `rr:${edit.pos.line}:${edit.end.line}:${edit.lines.join("\n")}`;
    case "append_at":
      return `aa:${edit.pos.line}:${edit.lines.join("\n")}`;
    case "prepend_at":
      return `pa:${edit.pos.line}:${edit.lines.join("\n")}`;
    case "append_file":
      return `af:${edit.lines.join("\n")}`;
    case "prepend_file":
      return `pf:${edit.lines.join("\n")}`;
  }
}

function detectOverlappingRanges(edits: HashlineEdit[]): string | null {
  const ranges: { start: number; end: number; idx: number }[] = [];
  for (let i = 0; i < edits.length; i++) {
    const edit = edits[i];
    if (edit.op === "replace_range") {
      ranges.push({ start: edit.pos.line, end: edit.end.line, idx: i });
    } else if (edit.op === "replace_line") {
      ranges.push({ start: edit.pos.line, end: edit.pos.line, idx: i });
    }
  }
  if (ranges.length < 2) return null;

  ranges.sort((a, b) => a.start - b.start || a.end - b.end);
  for (let i = 1; i < ranges.length; i++) {
    const prev = ranges[i - 1];
    const curr = ranges[i];
    if (curr.start <= prev.end) {
      return (
        `Overlapping range edits detected: ` +
        `edit ${prev.idx + 1} (lines ${prev.start}-${prev.end}) overlaps with ` +
        `edit ${curr.idx + 1} (lines ${curr.start}-${curr.end}).`
      );
    }
  }
  return null;
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Apply an array of hashline edits to file content.
 *
 * Follows the oh-my-pi architecture:
 * 1. Pre-validate all references (collect all mismatches before mutating)
 * 2. Deduplicate identical edits
 * 3. Sort bottom-up (highest effective line first)
 * 4. Apply splices in order
 *
 * Returns the modified content and metadata.
 */
export function applyHashlineEdits(content: string, edits: HashlineEdit[]): HashlineApplyReport {
  if (edits.length === 0) {
    return {
      content,
      noopEdits: 0,
      deduplicatedEdits: 0,
      firstChangedLine: undefined,
      warnings: [],
    };
  }

  const fileLines = content.length === 0 ? [] : content.split("\n");
  const originalFileLines = [...fileLines];
  const warnings: string[] = [];
  let firstChangedLine: number | undefined;
  let noopEdits = 0;

  // Phase 1: Pre-validate all hash references
  const mismatches: HashMismatch[] = [];
  for (const edit of edits) {
    switch (edit.op) {
      case "replace_line":
      case "append_at":
      case "prepend_at":
        validateRef(edit.pos, fileLines, mismatches);
        break;
      case "replace_range":
        validateRef(edit.pos, fileLines, mismatches);
        validateRef(edit.end, fileLines, mismatches);
        break;
      case "append_file":
      case "prepend_file":
        break;
    }
  }
  if (mismatches.length > 0) {
    throw new HashlineMismatchError(mismatches, fileLines);
  }

  // Phase 2: Deduplicate identical edits (before overlap detection)
  const seenKeys = new Map<string, number>();
  const dedupIndices = new Set<number>();
  for (let i = 0; i < edits.length; i++) {
    const key = getDeduplicationKey(edits[i]);
    if (seenKeys.has(key)) {
      dedupIndices.add(i);
    } else {
      seenKeys.set(key, i);
    }
  }
  const deduplicatedEdits = dedupIndices.size;
  const uniqueEdits = edits.filter((_, i) => !dedupIndices.has(i));

  // Phase 3: Check for overlapping ranges (after dedup)
  const overlapError = detectOverlappingRanges(uniqueEdits);
  if (overlapError) throw new Error(overlapError);

  // Phase 4: Boundary duplication warnings
  for (const edit of uniqueEdits) {
    let endLine: number;
    switch (edit.op) {
      case "replace_line":
        endLine = edit.pos.line;
        break;
      case "replace_range":
        endLine = edit.end.line;
        break;
      default:
        continue;
    }
    if (edit.lines.length === 0) continue;
    const nextSurvivingIdx = endLine;
    if (nextSurvivingIdx >= originalFileLines.length) continue;
    const nextSurvivingLine = originalFileLines[nextSurvivingIdx];
    const lastInsertedLine = edit.lines[edit.lines.length - 1];
    const trimmedNext = nextSurvivingLine.trim();
    const trimmedLast = lastInsertedLine.trim();
    if (trimmedLast.length > 0 && trimmedLast === trimmedNext) {
      const tag = `${endLine + 1}#${computeLineHash(endLine + 1, nextSurvivingLine)}`;
      warnings.push(
        `Possible boundary duplication: last replacement line "${trimmedLast}" matches next surviving line ${tag}.`,
      );
    }
  }

  // Phase 5: Sort bottom-up with precedence
  const annotated = uniqueEdits.map((edit, idx) => ({
    edit,
    idx,
    ...getEditSortKey(edit, fileLines.length),
  }));
  annotated.sort((a, b) => b.sortLine - a.sortLine || a.precedence - b.precedence || a.idx - b.idx);

  // Phase 6: Apply edits bottom-up
  function trackFirstChanged(line: number): void {
    if (firstChangedLine === undefined || line < firstChangedLine) {
      firstChangedLine = line;
    }
  }

  for (const { edit } of annotated) {
    switch (edit.op) {
      case "replace_line": {
        const origLines = originalFileLines.slice(edit.pos.line - 1, edit.pos.line);
        if (arraysEqual(origLines, edit.lines)) {
          noopEdits += 1;
          break;
        }
        fileLines.splice(edit.pos.line - 1, 1, ...edit.lines);
        trackFirstChanged(edit.pos.line);
        break;
      }
      case "replace_range": {
        const count = edit.end.line - edit.pos.line + 1;
        const origLines = originalFileLines.slice(edit.pos.line - 1, edit.end.line);
        if (arraysEqual(origLines, edit.lines)) {
          noopEdits += 1;
          break;
        }
        fileLines.splice(edit.pos.line - 1, count, ...edit.lines);
        trackFirstChanged(edit.pos.line);
        break;
      }
      case "append_at": {
        if (edit.lines.length === 0) {
          noopEdits += 1;
          break;
        }
        fileLines.splice(edit.pos.line, 0, ...edit.lines);
        trackFirstChanged(edit.pos.line + 1);
        break;
      }
      case "prepend_at": {
        if (edit.lines.length === 0) {
          noopEdits += 1;
          break;
        }
        fileLines.splice(edit.pos.line - 1, 0, ...edit.lines);
        trackFirstChanged(edit.pos.line);
        break;
      }
      case "append_file": {
        if (edit.lines.length === 0) {
          noopEdits += 1;
          break;
        }
        if (fileLines.length === 1 && fileLines[0] === "") {
          fileLines.splice(0, 1, ...edit.lines);
          trackFirstChanged(1);
        } else {
          fileLines.splice(fileLines.length, 0, ...edit.lines);
          trackFirstChanged(fileLines.length - edit.lines.length + 1);
        }
        break;
      }
      case "prepend_file": {
        if (edit.lines.length === 0) {
          noopEdits += 1;
          break;
        }
        if (fileLines.length === 1 && fileLines[0] === "") {
          fileLines.splice(0, 1, ...edit.lines);
        } else {
          fileLines.splice(0, 0, ...edit.lines);
        }
        trackFirstChanged(1);
        break;
      }
    }
  }

  return {
    content: fileLines.join("\n"),
    noopEdits,
    deduplicatedEdits,
    firstChangedLine,
    warnings,
  };
}

/**
 * Convenience wrapper: normalize raw edits and apply them.
 */
export function applyRawHashlineEdits(
  content: string,
  rawEdits: RawHashlineEdit[],
): HashlineApplyReport {
  const edits = rawEdits.map((raw, i) => normalizeEdit(raw, i));
  return applyHashlineEdits(content, edits);
}
