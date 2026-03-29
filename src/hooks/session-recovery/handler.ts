import type { PluginHookContributions } from "../../types/hook";
import { log } from "../../shared/logger";

export const SESSION_RECOVERY_PATTERNS = [
  /session.*crash/i,
  /session.*disconnect/i,
  /connection reset/i,
  /socket hang up/i,
  /network.*interrupted/i,
] as const;

const SESSION_RECOVERY_MARKER = "[SESSION RECOVERY]";

export const SESSION_RECOVERY_MESSAGE = `${SESSION_RECOVERY_MARKER}\nSession interruption detected. Reuse the latest confirmed state, avoid replaying completed tool calls, and continue from the last successful step.`;

type EventHook = NonNullable<PluginHookContributions["event"]>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractErrorText(input: Record<string, unknown>): string {
  const event = input.event;
  if (!isRecord(event)) {
    return "";
  }

  const properties = event.properties;
  if (!isRecord(properties)) {
    return "";
  }

  const rawError = properties.error;
  if (typeof rawError === "string") {
    return rawError;
  }

  if (isRecord(rawError) && typeof rawError.message === "string") {
    return rawError.message;
  }

  return "";
}

function appendRecoveryContext(properties: Record<string, unknown>, message: string): void {
  const existing = properties.recoveryContext;
  if (typeof existing === "string" && existing.includes(SESSION_RECOVERY_MARKER)) {
    return;
  }

  if (typeof existing === "string" && existing.length > 0) {
    properties.recoveryContext = `${existing}\n${message}`;
    return;
  }

  properties.recoveryContext = message;
}

export function createSessionRecoveryHandler(): EventHook {
  return async (input: unknown) => {
    if (!isRecord(input)) {
      return;
    }

    const event = input.event;
    if (!isRecord(event) || event.type !== "session.error") {
      return;
    }

    const properties = event.properties;
    if (!isRecord(properties)) {
      return;
    }

    const errorText = extractErrorText(input);
    const isRecoverableSessionError = SESSION_RECOVERY_PATTERNS.some((pattern) =>
      pattern.test(errorText),
    );

    if (!isRecoverableSessionError) {
      return;
    }

    appendRecoveryContext(properties, SESSION_RECOVERY_MESSAGE);
    log("[session-recovery] injected session recovery context");
  };
}
