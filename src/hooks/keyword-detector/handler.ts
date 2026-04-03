import type { PluginHookContributions } from "../../types/hook";
import { log } from "../../shared/logger";

export type ActiveMode = "ultrawork" | "think" | "fast";

const sessionModes = new Map<string, ActiveMode>();

export function getSessionMode(sessionId: string): ActiveMode | undefined {
  return sessionModes.get(sessionId);
}

export function setSessionMode(sessionId: string, mode: ActiveMode): void {
  sessionModes.set(sessionId, mode);
}

export function clearSessionMode(sessionId: string): void {
  sessionModes.delete(sessionId);
}

type ChatMessageHook = NonNullable<PluginHookContributions["chat.message"]>;

const CODE_BLOCK_PATTERN = /```[\s\S]*?```/g;
const INLINE_CODE_PATTERN = /`[^`]+`/g;

const KEYWORD_MAP: Array<{ pattern: RegExp; mode: ActiveMode }> = [
  { pattern: /\b(ultrawork|ulw|goatwork|goated)\b/i, mode: "ultrawork" },
  { pattern: /\b(deep-think|deepthink|ultrathink)\b/i, mode: "think" },
  { pattern: /\bfast\b/i, mode: "fast" },
];

function stripCodeBlocks(text: string): string {
  return text.replace(CODE_BLOCK_PATTERN, "").replace(INLINE_CODE_PATTERN, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractPartsText(parts: unknown): string {
  if (!Array.isArray(parts)) return "";
  return parts
    .filter(
      (p): p is { type: string; text: string } =>
        isRecord(p) && p.type === "text" && typeof p.text === "string",
    )
    .map((p) => p.text)
    .join(" ");
}

function detectMode(text: string): ActiveMode | null {
  const clean = stripCodeBlocks(text);
  for (const { pattern, mode } of KEYWORD_MAP) {
    if (pattern.test(clean)) {
      return mode;
    }
  }
  return null;
}

export function createKeywordDetectorHandler(): ChatMessageHook {
  return async (input: unknown, output: unknown): Promise<void> => {
    if (!isRecord(input) || !isRecord(output)) return;
    const sessionID = input.sessionID;
    if (typeof sessionID !== "string") return;

    const text = extractPartsText(output.parts);
    const mode = detectMode(text);
    if (!mode) return;

    sessionModes.set(sessionID, mode);
    log(`[keyword-detector] mode "${mode}" set`, { sessionID });
  };
}
