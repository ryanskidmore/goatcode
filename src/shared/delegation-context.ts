import type { OpenCodeContext } from "../types/plugin";
import { log } from "./logger";

/**
 * Pattern injected by the executor into child session prompts.
 * @see src/tools/delegate-task/executor.ts injectDelegationDepth
 */
export const DEPTH_MARKER_PATTERN = /<!-- goatcode:delegation_depth=(\d+) -->/;

/**
 * Reads the current session's messages to find the delegation depth marker.
 * Returns null on any error (fail-closed — blocks delegation when depth is unknown).
 * Returns 0 for root sessions (no marker or no session ID).
 */
export async function extractDelegationDepth(
  client: OpenCodeContext["client"],
  sessionID: string | undefined,
): Promise<number | null> {
  if (!sessionID) return 0;

  try {
    const result = await client.session.messages({ path: { id: sessionID } });
    const messages = (result.data ?? []) as Array<Record<string, unknown>>;
    // Depth marker is in the initial prompt — only check first 3 messages
    const raw = JSON.stringify(messages.slice(0, 3));
    const match = raw.match(DEPTH_MARKER_PATTERN);
    if (match) return parseInt(match[1], 10);
  } catch {
    log("[delegation-context] Could not determine delegation depth", { sessionID });
    return null;
  }

  return 0;
}

/**
 * Extracts the current session ID from a tool execution context.
 * Works across both legacy (`sessionID`) and modern (`sessionId`) property names.
 */
export function resolveCallerSessionID(toolContext: unknown): string | undefined {
  const ctx = toolContext as Record<string, unknown>;

  const legacy = ctx.sessionID;
  if (typeof legacy === "string" && legacy.length > 0) return legacy;

  const camel = ctx.sessionId;
  if (typeof camel === "string" && camel.length > 0) return camel;

  return undefined;
}
