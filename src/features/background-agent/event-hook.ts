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

function getErrorTextFromUnknown(error: unknown): string {
  if (typeof error === "string") return error;
  if (isRecord(error) && typeof error.message === "string") return error.message;
  return "Unknown error";
}

function extractStatusMetadataFromInfo(properties: Record<string, unknown>): {
  model?: string;
  retryRequested?: boolean;
  retryWithModel?: string;
} {
  const info = properties.info;
  const metadata: {
    model?: string;
    retryRequested?: boolean;
    retryWithModel?: string;
  } = {};

  if (typeof properties.model === "string" && properties.model.length > 0) {
    metadata.model = properties.model;
  } else if (isRecord(info)) {
    const providerID = info.providerID;
    const modelID = info.modelID;
    if (
      typeof providerID === "string" &&
      providerID.length > 0 &&
      typeof modelID === "string" &&
      modelID.length > 0
    ) {
      metadata.model = `${providerID}/${modelID}`;
    }
  }

  if (typeof properties.retryRequested === "boolean") {
    metadata.retryRequested = properties.retryRequested;
  }

  if (typeof properties.retryWithModel === "string" && properties.retryWithModel.length > 0) {
    metadata.retryWithModel = properties.retryWithModel;
  }

  return metadata;
}

function getSessionErrorMetadata(properties: Record<string, unknown>): {
  error?: unknown;
  model?: string;
  retryRequested?: boolean;
  retryWithModel?: string;
} {
  const metadata: {
    error?: unknown;
    model?: string;
    retryRequested?: boolean;
    retryWithModel?: string;
  } = {
    error: properties.error,
  };

  if (typeof properties.model === "string" && properties.model.length > 0) {
    metadata.model = properties.model;
  }

  if (typeof properties.retryRequested === "boolean") {
    metadata.retryRequested = properties.retryRequested;
  }

  if (typeof properties.retryWithModel === "string" && properties.retryWithModel.length > 0) {
    metadata.retryWithModel = properties.retryWithModel;
  }

  return metadata;
}

export function extractSessionErrorMetadata(properties: Record<string, unknown>): {
  error?: unknown;
  model?: string;
  retryRequested?: boolean;
  retryWithModel?: string;
} {
  return getSessionErrorMetadata(properties);
}

function getMessageUpdatedMetadata(properties: Record<string, unknown>): {
  error?: unknown;
  model?: string;
  retryRequested?: boolean;
  retryWithModel?: string;
} {
  const info = properties.info;
  if (!isRecord(info)) {
    return getSessionErrorMetadata(properties);
  }

  const metadata: {
    error?: unknown;
    model?: string;
    retryRequested?: boolean;
    retryWithModel?: string;
  } = {
    error: info.error,
  };

  if (typeof properties.model === "string" && properties.model.length > 0) {
    metadata.model = properties.model;
  } else {
    const providerID = info.providerID;
    const modelID = info.modelID;
    if (
      typeof providerID === "string" &&
      providerID.length > 0 &&
      typeof modelID === "string" &&
      modelID.length > 0
    ) {
      metadata.model = `${providerID}/${modelID}`;
    }
  }

  if (typeof properties.retryRequested === "boolean") {
    metadata.retryRequested = properties.retryRequested;
  }

  if (typeof properties.retryWithModel === "string" && properties.retryWithModel.length > 0) {
    metadata.retryWithModel = properties.retryWithModel;
  }

  return metadata;
}

export function extractMessageUpdatedMetadata(properties: Record<string, unknown>): {
  error?: unknown;
  model?: string;
  retryRequested?: boolean;
  retryWithModel?: string;
} {
  return getMessageUpdatedMetadata(properties);
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
    } catch (err) {
      // Expected when background agent hasn't been initialised yet.
      if (err instanceof Error && err.message.includes("not initialized")) {
        return;
      }
      log("[bg-event-hook] Unexpected error getting background agent", { error: err });
      return;
    }

    const sessionId = getSessionIdFromEvent(properties);
    if (!sessionId) return;

    if (type === "session.idle") {
      await manager.handleSessionIdle(sessionId);
    } else if (type === "session.error") {
      const errorText = getErrorText(properties);
      const metadata = getSessionErrorMetadata(properties);
      log("[bg-event-hook] session.error for background task", { sessionId, error: errorText });
      await manager.handleSessionError(sessionId, errorText, metadata);
    } else if (type === "session.status") {
      const status = properties.status;
      if (!isRecord(status) || status.type !== "retry") {
        return;
      }
      const statusMessage = status.message;
      if (typeof statusMessage !== "string" || statusMessage.length === 0) {
        return;
      }
      const metadata = {
        ...extractStatusMetadataFromInfo(properties),
        error: { message: statusMessage },
      };
      log("[bg-event-hook] session.status retry for background task", {
        sessionId,
        error: statusMessage,
      });
      await manager.handleSessionError(sessionId, statusMessage, metadata);
    } else if (type === "message.updated") {
      const info = properties.info;
      if (!isRecord(info) || info.role !== "assistant" || !info.error) {
        return;
      }
      const metadata = getMessageUpdatedMetadata(properties);
      const errorText = getErrorTextFromUnknown(info.error);
      log("[bg-event-hook] message.updated error for background task", {
        sessionId,
        error: errorText,
      });
      await manager.handleSessionError(sessionId, errorText, metadata);
    }
  };
}
