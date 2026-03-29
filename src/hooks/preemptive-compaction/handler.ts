import { log } from "../../shared/logger";

type PreemptiveCompactionInput = {
  sessionID?: string;
  usage?: { inputTokens?: number; cacheReadTokens?: number; totalTokens?: number };
  context?: { limitTokens?: number };
  tokenUsage?: { input?: number; cacheRead?: number; total?: number };
  contextLimit?: number;
};

type PreemptiveCompactionDeps = {
  threshold?: number;
  getTokenUsage?: (
    input: PreemptiveCompactionInput,
  ) => { usedTokens: number; contextLimit: number } | undefined;
  compactSession?: (
    sessionID: string,
    info: { usageRatio: number; usedTokens: number; contextLimit: number },
  ) => void | Promise<void>;
};

function resolveTokenUsage(
  input: PreemptiveCompactionInput,
): { usedTokens: number; contextLimit: number } | undefined {
  const usageFromUsage = input.usage;
  const usageFromTokenUsage = input.tokenUsage;

  const usedTokens =
    usageFromUsage?.totalTokens ??
    usageFromTokenUsage?.total ??
    (usageFromUsage
      ? (usageFromUsage.inputTokens ?? 0) + (usageFromUsage.cacheReadTokens ?? 0)
      : (usageFromTokenUsage?.input ?? 0) + (usageFromTokenUsage?.cacheRead ?? 0));

  const contextLimit = input.context?.limitTokens ?? input.contextLimit;

  if (!contextLimit || contextLimit <= 0) return undefined;
  return { usedTokens, contextLimit };
}

export function createPreemptiveCompactionHandler(deps: PreemptiveCompactionDeps = {}) {
  const threshold = deps.threshold ?? 0.8;
  const compactedWhileAboveThreshold = new Set<string>();

  return async (input: PreemptiveCompactionInput): Promise<void> => {
    const sessionID = input.sessionID;
    if (!sessionID) return;

    const resolved = deps.getTokenUsage?.(input) ?? resolveTokenUsage(input);
    if (!resolved) return;

    const usageRatio = resolved.usedTokens / resolved.contextLimit;
    if (usageRatio < threshold) {
      compactedWhileAboveThreshold.delete(sessionID);
      return;
    }

    if (compactedWhileAboveThreshold.has(sessionID)) return;

    compactedWhileAboveThreshold.add(sessionID);

    try {
      await Promise.resolve(
        deps.compactSession?.(sessionID, {
          usageRatio,
          usedTokens: resolved.usedTokens,
          contextLimit: resolved.contextLimit,
        }),
      );
      log("[preemptive-compaction] triggered compaction", {
        sessionID,
        usageRatio,
        usedTokens: resolved.usedTokens,
        contextLimit: resolved.contextLimit,
      });
    } catch (error) {
      compactedWhileAboveThreshold.delete(sessionID);
      log("[preemptive-compaction] compaction trigger failed", {
        sessionID,
        error: String(error),
      });
    }
  };
}
