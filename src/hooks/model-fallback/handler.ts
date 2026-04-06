import { buildFallbackChain } from "../../shared/fallback-chain";
import { resolveQualifiedModel } from "../../shared/model-resolution-pipeline";
import { log } from "../../shared/logger";

type ModelSwitchReason = "rate-limit" | "service-unavailable";

type ModelFallbackErrorEvent = {
  event: {
    type: string;
    properties?: unknown;
  };
};

type ModelFallbackState = {
  sessionModels: Map<string, string>;
};

type ModelFallbackDependencies = {
  defaultFallbackChain?: string[];
  getCurrentModel?: (sessionID: string) => string | undefined;
  getAvailableModels?: (sessionID: string) => Set<string>;
  setCurrentModel?: (sessionID: string, model: string) => void | Promise<void>;
  onFallbackApplied?: (input: {
    sessionID: string;
    previousModel: string;
    nextModel: string;
    reason: ModelSwitchReason;
  }) => void | Promise<void>;
};

function toRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") return undefined;
  return value as Record<string, unknown>;
}

function toStatusCode(error: unknown): number | undefined {
  const record = toRecord(error);
  if (!record) return undefined;

  const direct = record["statusCode"];
  if (typeof direct === "number") return direct;

  const status = record["status"];
  if (typeof status === "number") return status;

  const nested = toRecord(record["error"]);
  if (nested) {
    const nestedCode = nested["statusCode"];
    if (typeof nestedCode === "number") return nestedCode;
  }

  return undefined;
}

function getErrorMessage(error: unknown): string {
  if (typeof error === "string") return error.toLowerCase();
  const record = toRecord(error);
  const message = record?.["message"];
  if (typeof message === "string") return message.toLowerCase();
  return "";
}

function classifyModelFallbackReason(error: unknown): ModelSwitchReason | undefined {
  const statusCode = toStatusCode(error);
  const message = getErrorMessage(error);

  if (
    statusCode === 429 ||
    message.includes("rate limit") ||
    message.includes("too many requests")
  ) {
    return "rate-limit";
  }

  if (
    statusCode === 503 ||
    message.includes("service unavailable") ||
    message.includes("temporarily unavailable")
  ) {
    return "service-unavailable";
  }

  return undefined;
}

function getSessionID(properties: Record<string, unknown>): string | undefined {
  const sessionID = properties["sessionID"];
  if (typeof sessionID === "string" && sessionID.length > 0) return sessionID;

  const info = toRecord(properties["info"]);
  const infoID = info?.["id"];
  if (typeof infoID === "string" && infoID.length > 0) return infoID;

  return undefined;
}

function getNextFallbackModel(input: {
  currentModel: string;
  configuredFallbacks: string | string[] | undefined;
  defaultChain: string[];
  availableModels: Set<string>;
}): string | undefined {
  const fullChain = buildFallbackChain(input.configuredFallbacks, input.defaultChain);
  const currentIndex = fullChain.findIndex(
    (model) => model.toLowerCase() === input.currentModel.toLowerCase(),
  );
  const remaining = currentIndex >= 0 ? fullChain.slice(currentIndex + 1) : fullChain;

  return resolveQualifiedModel({
    fallbackChain: remaining,
    availableModels: input.availableModels,
  })?.model;
}

export function createModelFallbackHandler(deps: ModelFallbackDependencies = {}) {
  const state: ModelFallbackState = { sessionModels: new Map() };
  const defaultSwitch = async (sessionID: string, model: string) => {
    state.sessionModels.set(sessionID, model);
  };

  return async ({ event }: ModelFallbackErrorEvent): Promise<void> => {
    if (event.type !== "session.error") return;

    const properties = toRecord(event.properties);
    if (!properties) return;

    const reason = classifyModelFallbackReason(properties["error"]);
    if (!reason) return;

    const sessionID = getSessionID(properties);
    if (!sessionID) return;

    const configuredFallbacks = properties["fallbackChain"];
    const fallbackInput =
      typeof configuredFallbacks === "string" || Array.isArray(configuredFallbacks)
        ? configuredFallbacks
        : undefined;

    const eventModel = properties["model"];
    const currentModel =
      (typeof eventModel === "string" && eventModel.length > 0 ? eventModel : undefined) ??
      deps.getCurrentModel?.(sessionID) ??
      state.sessionModels.get(sessionID);
    if (!currentModel) return;

    const availableModels = deps.getAvailableModels?.(sessionID) ?? new Set<string>();
    const nextModel = getNextFallbackModel({
      currentModel,
      configuredFallbacks: fallbackInput,
      defaultChain: deps.defaultFallbackChain ?? [],
      availableModels,
    });

    if (!nextModel || nextModel.toLowerCase() === currentModel.toLowerCase()) {
      log("[model-fallback] no eligible fallback model", { sessionID, currentModel, reason });
      return;
    }

    const applyModel = deps.setCurrentModel ?? defaultSwitch;
    await Promise.resolve(applyModel(sessionID, nextModel));

    await Promise.resolve(
      deps.onFallbackApplied?.({
        sessionID,
        previousModel: currentModel,
        nextModel,
        reason,
      }),
    );

    log("[model-fallback] switched model", {
      sessionID,
      from: currentModel,
      to: nextModel,
      reason,
    });
  };
}
