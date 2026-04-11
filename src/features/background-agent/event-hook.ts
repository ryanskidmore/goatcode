import type { PluginHookContributions } from "../../types/hook";
import { log } from "../../shared/logger";
import { getBackgroundAgent } from "./singleton";

type EventHook = NonNullable<PluginHookContributions["event"]>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getSessionIdFromEvent(properties: Record<string, unknown>): string | undefined {
  // Direct sessionID field
  if (typeof properties.sessionID === "string" && properties.sessionID.length > 0) {
    return properties.sessionID;
  }
  // Nested info.id
  const info = properties.info;
  if (isRecord(info)) {
    if (typeof info.id === "string" && info.id.length > 0) return info.id;
    if (typeof info.sessionID === "string" && info.sessionID.length > 0) return info.sessionID;
  }
  return undefined;
}

function getErrorText(properties: Record<string, unknown>): string {
  const error = properties.error;
  if (typeof error === "string") return error;
  if (isRecord(error) && typeof error.message === "string") return error.message;
  return "Unknown error";
}

/**
 * Event hook that routes session lifecycle events to the
 * BackgroundAgentManager for event-driven completion detection.
 *
 * Listens for:
 * - session.idle  → may indicate the background agent finished its work
 * - session.error → the background session encountered an error
 */
export function createBackgroundAgentEventHook(): EventHook {
  return async (input: unknown) => {
    if (!isRecord(input)) return;
    const event = input.event;
    if (!isRecord(event)) return;
    const type = event.type;
    if (typeof type !== "string") return;
    const properties = event.properties;
    if (!isRecord(properties)) return;

    let manager: ReturnType<typeof getBackgroundAgent>["manager"];
    try {
      manager = getBackgroundAgent().manager;
    } catch {
      // Background agent not initialised yet — nothing to route.
      return;
    }

    const sessionId = getSessionIdFromEvent(properties);
    if (!sessionId) return;

    if (type === "session.idle") {
      await manager.handleSessionIdle(sessionId);
    } else if (type === "session.error") {
      const errorText = getErrorText(properties);
      log("[bg-event-hook] session.error for background task", { sessionId, error: errorText });
      await manager.handleSessionError(sessionId, errorText);
    }
  };
}
