import { buildFallbackChain } from "../../shared/fallback-chain";
import { resolveQualifiedModel } from "../../shared/model-resolution-pipeline";
import { log } from "../../shared/logger";

type RuntimeFallbackReason = "model-not-found" | "context-exceeded";

type RuntimeFallbackEvent = {
  event: {
    type: string;
    properties?: unknown;
  };
};

type RuntimeFallbackDependencies = {
  defaultFallbackChain?: string[];
  getCurrentModel?: (sessionID: string) => string | undefined;
  getAvailableModels?: (sessionID: string) => Set<string>;
  setCurrentModel?: (sessionID: string, model: string) => void | Promise<void>;
  onFallbackApplied?: (input: {
    sessionID: string;
    previousModel: string;
    nextModel: string;
    reason: RuntimeFallbackReason;
  }) => void | Promise<void>;
};

function toRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") return undefined;
  return value as Record<string, unknown>;
}

function getSessionID(properties: Record<string, unknown>): string | undefined {
  const sessionID = properties["sessionID"];
  if (typeof sessionID === "string" && sessionID.length > 0) return sessionID;

  const info = toRecord(properties["info"]);
  const infoID = info?.["id"];
  if (typeof infoID === "string" && infoID.length > 0) return infoID;

  return undefined;
}

function getErrorMessage(error: unknown): string {
  if (typeof error === "string") return error.toLowerCase();
  const record = toRecord(error);
  const message = record?.["message"];
  if (typeof message === "string") return message.toLowerCase();

  const nested = toRecord(record?.["error"]);
  const nestedMessage = nested?.["message"];
  if (typeof nestedMessage === "string") return nestedMessage.toLowerCase();

  return "";
}

function classifyRuntimeFallbackReason(error: unknown): RuntimeFallbackReason | undefined {
  const message = getErrorMessage(error);
  if (message.includes("model not found") || message.includes("unknown model")) {
    return "model-not-found";
  }
  if (
    message.includes("context length") ||
    message.includes("context window") ||
    message.includes("maximum context") ||
    message.includes("too many tokens")
  ) {
    return "context-exceeded";
  }
  return undefined;
}

function getProvider(model: string): string | undefined {
  const idx = model.indexOf("/");
  if (idx <= 0) return undefined;
  return model.slice(0, idx).toLowerCase();
}

function getNextRuntimeFallbackModel(input: {
  currentModel: string;
  configuredFallbacks: string | string[] | undefined;
  defaultChain: string[];
  availableModels: Set<string>;
}): string | undefined {
  const currentProvider = getProvider(input.currentModel);
  const fullChain = buildFallbackChain(input.configuredFallbacks, input.defaultChain);
  const currentIndex = fullChain.findIndex(
    (model) => model.toLowerCase() === input.currentModel.toLowerCase(),
  );
  const remaining = currentIndex >= 0 ? fullChain.slice(currentIndex + 1) : fullChain;

  const compatibleRemaining =
    currentProvider === undefined
      ? remaining
      : remaining.filter((model) => getProvider(model) === currentProvider);

  const compatibleResolved = resolveQualifiedModel({
    fallbackChain: compatibleRemaining,
    availableModels: input.availableModels,
  })?.model;
  if (compatibleResolved) return compatibleResolved;

  return resolveQualifiedModel({
    fallbackChain: remaining,
    availableModels: input.availableModels,
  })?.model;
}

export function createRuntimeFallbackHandler(deps: RuntimeFallbackDependencies = {}) {
  const sessionModels = new Map<string, string>();
  const defaultSwitch = async (sessionID: string, model: string) => {
    sessionModels.set(sessionID, model);
  };

  return async ({ event }: RuntimeFallbackEvent): Promise<void> => {
    if (event.type !== "session.error") return;

    const properties = toRecord(event.properties);
    if (!properties) return;

    const reason = classifyRuntimeFallbackReason(properties["error"]);
    if (!reason) return;

    const sessionID = getSessionID(properties);
    if (!sessionID) return;

    const eventModel = properties["model"];
    const currentModel =
      (typeof eventModel === "string" && eventModel.length > 0 ? eventModel : undefined) ??
      deps.getCurrentModel?.(sessionID) ??
      sessionModels.get(sessionID);
    if (!currentModel) return;

    const configuredFallbacks = properties["fallbackChain"];
    const fallbackInput =
      typeof configuredFallbacks === "string" || Array.isArray(configuredFallbacks)
        ? configuredFallbacks
        : undefined;

    const availableModels = deps.getAvailableModels?.(sessionID) ?? new Set<string>();
    const nextModel = getNextRuntimeFallbackModel({
      currentModel,
      configuredFallbacks: fallbackInput,
      defaultChain: deps.defaultFallbackChain ?? [],
      availableModels,
    });

    if (!nextModel || nextModel.toLowerCase() === currentModel.toLowerCase()) {
      log("[runtime-fallback] no compatible fallback model", { sessionID, currentModel, reason });
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

    log("[runtime-fallback] switched model", {
      sessionID,
      from: currentModel,
      to: nextModel,
      reason,
    });
  };
}
