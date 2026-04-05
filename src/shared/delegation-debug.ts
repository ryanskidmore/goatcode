import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const DEFAULT_DEBUG_FILE = "/tmp/goatcode-delegation.log";

function isEnabled(): boolean {
  return process.env.GOATCODE_DEBUG_DELEGATION === "1";
}

function getDebugFilePath(): string {
  return process.env.GOATCODE_DEBUG_DELEGATION_FILE || DEFAULT_DEBUG_FILE;
}

function sanitize(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }

  if (typeof value === "string") {
    return value.length > 500 ? `${value.slice(0, 500)}…(truncated)` : value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 25).map((entry) => sanitize(entry));
  }

  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      out[key] = sanitize(entry);
    }
    return out;
  }

  return value;
}

export function logDelegationDebug(event: string, payload: Record<string, unknown> = {}): void {
  if (!isEnabled()) return;

  try {
    const filePath = getDebugFilePath();
    mkdirSync(dirname(filePath), { recursive: true });
    const entry = {
      ts: new Date().toISOString(),
      event,
      payload: sanitize(payload),
    };
    appendFileSync(filePath, `${JSON.stringify(entry)}\n`);
  } catch {
    // Debug logging must never affect normal task execution.
  }
}
