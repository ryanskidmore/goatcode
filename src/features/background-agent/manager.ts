import type { OpenCodeContext } from "../../types/plugin";

import { log } from "../../shared/logger";
import { readConnectedProviders } from "../../shared/connected-providers-cache";
import { normalizeModel, parseModelId } from "../../shared/model-normalization";
import { resetMessageCursor } from "../session-state/session-cursor";
import { deleteSessionTools } from "../session-state/session-tools-store";
import type { FallbackEntry } from "../../agents/fallback-chains";

import { ConcurrencyManager } from "./concurrency";
import { spawnBackgroundSession } from "./spawner";
import type { BackgroundTask, LaunchInput } from "./types";

const TASK_TTL_MS = 5 * 60 * 1_000;

/**
 * Minimum elapsed time (ms) before accepting a session.idle event as
 * completion. Prevents premature completion when idle fires before the
 * agent has produced any output (e.g. during session initialisation).
 */
const MIN_IDLE_TIME_MS = 5_000;

/**
 * Hard cap on model-switch retries per delegated task.
 * Prevents infinite retry loops when all fallback models fail.
 */
const MAX_MODEL_SWITCH_RETRIES = 4;

type SessionErrorMetadata = {
  error?: unknown;
  model?: string;
  retryRequested?: boolean;
  retryWithModel?: string;
};

type ProviderFailureReason = "quota" | "rate-limit" | "service-unavailable" | "model-unavailable";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function collectErrorFragments(error: unknown, depth = 0): string[] {
  if (depth > 5) return [];

  if (typeof error === "string") {
    return [error];
  }

  if (!isRecord(error)) {
    return [];
  }

  const fragments: string[] = [];
  const message = error["message"];
  if (typeof message === "string") {
    fragments.push(message);
  }

  const status = error["status"];
  if (typeof status === "number") {
    fragments.push(String(status));
  }

  const statusCode = error["statusCode"];
  if (typeof statusCode === "number") {
    fragments.push(String(statusCode));
  }

  const code = error["code"];
  if (typeof code === "string") {
    fragments.push(code);
  }

  const data = error["data"];
  if (isRecord(data)) {
    if (typeof data["message"] === "string") fragments.push(data["message"]);
    if (typeof data["responseBody"] === "string") fragments.push(data["responseBody"]);
    if (typeof data["statusCode"] === "number") fragments.push(String(data["statusCode"]));
  }

  const nested = error["error"];
  if (nested !== undefined && nested !== error) {
    fragments.push(...collectErrorFragments(nested, depth + 1));
  }

  return fragments;
}

function readStatusCode(error: unknown): number | undefined {
  if (!isRecord(error)) return undefined;
  const directStatus = error["status"];
  if (typeof directStatus === "number") return directStatus;
  const directCode = error["statusCode"];
  if (typeof directCode === "number") return directCode;
  const nested = error["error"];
  if (nested !== undefined && nested !== error) {
    return readStatusCode(nested);
  }
  return undefined;
}

function classifyProviderFailure(input: {
  errorMessage: string;
  rawError?: unknown;
}): ProviderFailureReason | undefined {
  const status = readStatusCode(input.rawError);
  const haystack = [input.errorMessage, ...collectErrorFragments(input.rawError)]
    .join(" ")
    .toLowerCase();

  const quotaSignals = [
    /insufficient\s+quota/i,
    /quota\s*exceeded/i,
    /usage\s*exceeded/i,
    /usage\s+limit/i,
    /insufficient\s+credits?/i,
    /credit\s+balance/i,
    /billing\s+hard\s+limit/i,
    /resource\s*exhausted/i,
  ];
  if (quotaSignals.some((pattern) => pattern.test(haystack))) {
    return "quota";
  }

  const rateLimitSignals = [
    /\b429\b/i,
    /rate\s*-?\s*limit/i,
    /too\s+many\s+requests/i,
    /high\s+concurrency/i,
  ];
  if (status === 429 || rateLimitSignals.some((pattern) => pattern.test(haystack))) {
    return "rate-limit";
  }

  const serviceSignals = [/service\s+unavailable/i, /temporarily\s+unavailable/i, /overloaded/i];
  if (
    status === 502 ||
    status === 503 ||
    status === 504 ||
    serviceSignals.some((p) => p.test(haystack))
  ) {
    return "service-unavailable";
  }

  const modelSignals = [/model\s+not\s+found/i, /unknown\s+model/i, /model.*does\s+not\s+exist/i];
  if (modelSignals.some((pattern) => pattern.test(haystack))) {
    return "model-unavailable";
  }

  return undefined;
}

function providerFromModel(model: string | undefined): string | undefined {
  if (!model) return undefined;
  return parseModelId(model)?.provider;
}

function buildQualifiedFallbackModels(chain: FallbackEntry[] | undefined): string[] {
  if (!chain || chain.length === 0) return [];

  const connected = readConnectedProviders();
  const connectedSet = connected
    ? new Set(connected.map((provider) => provider.toLowerCase().trim()))
    : null;
  const seen = new Set<string>();
  const result: string[] = [];
  const disconnectedCandidates: string[] = [];

  for (const entry of chain) {
    for (const provider of entry.providers) {
      const normalizedProvider = provider.toLowerCase().trim();
      const qualified = normalizeModel(`${normalizedProvider}/${entry.model}`);
      if (!qualified || seen.has(qualified)) {
        continue;
      }

      seen.add(qualified);

      if (connectedSet && !connectedSet.has(normalizedProvider)) {
        disconnectedCandidates.push(qualified);
        continue;
      }

      result.push(qualified);
    }
  }

  // If the connected-providers cache filters out every configured fallback,
  // keep progressing instead of hard-failing with "no eligible fallback".
  // We still prefer connected candidates first, then try disconnected ones.
  if (result.length === 0) {
    return disconnectedCandidates;
  }

  return [...result, ...disconnectedCandidates];
}

function formatFallbackDiagnostics(task: BackgroundTask): string {
  const retryCount = task.retryCount ?? 0;
  const attemptedModels = Array.isArray(task.attemptedModels)
    ? task.attemptedModels.filter(
        (model): model is string => typeof model === "string" && model.length > 0,
      )
    : [];
  const chainEntries = Array.isArray(task.fallbackChain) ? task.fallbackChain : [];
  const fallbackModels = buildQualifiedFallbackModels(chainEntries);

  const lines: string[] = [
    "fallback diagnostics:",
    `- retries_attempted: ${retryCount}`,
    `- attempted_models: ${attemptedModels.length > 0 ? attemptedModels.join(", ") : "(none)"}`,
  ];

  if (chainEntries.length > 0) {
    lines.push(
      `- fallback_chain: ${chainEntries
        .map((entry) => `${entry.providers.join("|")}/${entry.model}`)
        .join(" -> ")}`,
    );
  }

  if (fallbackModels.length > 0) {
    lines.push(`- eligible_fallback_models: ${fallbackModels.join(", ")}`);
  }

  return lines.join("\n");
}

function reorderForQuota(candidates: string[], currentModel: string | undefined): string[] {
  const currentProvider = providerFromModel(currentModel);
  if (!currentProvider) return candidates;

  const differentProvider = candidates.filter(
    (model) => providerFromModel(model) !== currentProvider,
  );
  const sameProvider = candidates.filter((model) => providerFromModel(model) === currentProvider);
  return [...differentProvider, ...sameProvider];
}

type SessionMessage = {
  role?: string;
  content?: string;
  info?: { role?: string };
  parts?: Array<{ type?: string; text?: string; thinking?: string }>;
};

function extractAssistantContent(message: SessionMessage): string | undefined {
  if (
    message.role === "assistant" &&
    typeof message.content === "string" &&
    message.content.trim().length > 0
  ) {
    return message.content;
  }

  const role = message.role ?? message.info?.role;
  if (role !== "assistant" || !Array.isArray(message.parts)) {
    return undefined;
  }

  const content = message.parts
    .filter(
      (part) =>
        part.type === "text" && typeof part.text === "string" && part.text.trim().length > 0,
    )
    .map((part) => part.text!.trim())
    .join("\n\n");

  return content.length > 0 ? content : undefined;
}

function isTerminalStatus(status: BackgroundTask["status"]): boolean {
  return status === "completed" || status === "failed" || status === "cancelled";
}

type CompletionResolver = {
  resolve: (task: BackgroundTask) => void;
  timer: ReturnType<typeof setTimeout>;
};

export class BackgroundAgentManager {
  private readonly tasks = new Map<string, BackgroundTask>();
  private readonly concurrency: ConcurrencyManager;
  /** O(1) lookup from session ID to task ID for event routing. */
  private readonly tasksBySessionId = new Map<string, string>();
  /** Per-session context so concurrent tasks never share a stale client. */
  private readonly ctxBySessionId = new Map<string, OpenCodeContext>();
  /** Promise resolvers for callers blocking on task completion. */
  private readonly completionResolvers = new Map<string, CompletionResolver[]>();

  constructor(concurrencyLimit = 10) {
    this.concurrency = new ConcurrencyManager(concurrencyLimit);
  }

  async launch(ctx: OpenCodeContext, input: LaunchInput): Promise<BackgroundTask> {
    const initialModel = normalizeModel(input.model) ?? input.model;
    const task: BackgroundTask = {
      id: input.id,
      status: "queued",
      prompt: input.prompt,
      model: input.model,
      title: input.title,
      fallbackChain: input.fallbackChain,
      retryCount: 0,
      attemptedModels: [initialModel],
      createdAt: Date.now(),
      parentSessionID: input.parentSessionID,
      delegationDepth: input.delegationDepth ?? 0,
    };

    this.tasks.set(input.id, task);
    log("[manager] Task queued", { id: input.id });

    void this.startTask(ctx, task, input);
    return task;
  }

  /**
   * Phase B: acquire concurrency slot, spawn background session, then
   * wait for event-driven completion (via handleSessionIdle / handleSessionError).
   */
  private async startTask(
    ctx: OpenCodeContext,
    task: BackgroundTask,
    input: LaunchInput,
  ): Promise<void> {
    try {
      const poolKey = this.concurrencyKey(task);
      await this.concurrency.acquire(poolKey);
      task.concurrencyPoolKey = poolKey;

      if (task.status === "cancelled") {
        this.releaseConcurrency(task);
        return;
      }

      task.status = "running";
      task.startedAt = Date.now();
      log("[manager] Task started", { id: task.id });

      const { sessionId } = await spawnBackgroundSession(ctx, input);
      task.sessionId = sessionId;
      task.sessionStartedAt = Date.now();
      this.tasksBySessionId.set(sessionId, task.id);
      this.ctxBySessionId.set(sessionId, ctx);

      // cancel() may have mutated status concurrently while spawn was in-flight
      if ((task as BackgroundTask).status === "cancelled") {
        this.tasksBySessionId.delete(sessionId);
        this.ctxBySessionId.delete(sessionId);
        try {
          await ctx.client.session.delete({ path: { id: sessionId } });
        } catch (error) {
          log("[manager] Failed to delete session after late cancel", { id: task.id, error });
        }
        return;
      }

      // No polling loop — completion is now driven by session events
      // routed through handleSessionIdle() and handleSessionError().
    } catch (error) {
      if (task.status === "cancelled") return;
      this.fail(task.id, error instanceof Error ? error.message : String(error));
    }
  }

  // ---------------------------------------------------------------------------
  // Event-driven completion handlers
  // ---------------------------------------------------------------------------

  /**
   * Handle a session.idle event. Called from the plugin event hook when
   * a background session goes idle (agent finished its turn).
   *
   * If the session has produced meaningful assistant output and enough
   * time has elapsed, the task is marked as completed.
   */
  async handleSessionIdle(sessionId: string): Promise<void> {
    const taskId = this.tasksBySessionId.get(sessionId);
    if (!taskId) return;

    const task = this.tasks.get(taskId);
    if (!task || isTerminalStatus(task.status)) return;

    const ctx = this.ctxBySessionId.get(sessionId);
    if (!ctx) return;

    try {
      const messagesResult = await ctx.client.session.messages({
        path: { id: sessionId },
      });

      const messages = (messagesResult.data ?? []) as SessionMessage[];

      // Suppress genuinely empty start-up idles (no messages yet).
      // Once messages exist, evaluate completion immediately so fast
      // tasks aren't stranded by the time guard.
      if (messages.length === 0) {
        const anchor = task.sessionStartedAt ?? task.startedAt ?? 0;
        const elapsed = anchor > 0 ? Date.now() - anchor : 0;
        if (elapsed < MIN_IDLE_TIME_MS) {
          log("[manager] Ignoring early empty session.idle", { id: task.id, elapsed });
          return;
        }
        // Empty transcript after the guard period — agent never started.
        this.fail(
          task.id,
          "Background agent produced no output (0 messages). " +
            "This may indicate rate limiting or a session creation failure.",
        );
        return;
      }

      // Base completion on the final message only. Using
      // getLastAssistantContent() would scan the entire history and
      // could promote stale earlier text (e.g. "Let me check...") as
      // the result while the agent is still mid-tool-call.
      const lastMessage = messages[messages.length - 1];
      const lastContent = extractAssistantContent(lastMessage);

      if (lastContent && lastContent.trim().length > 0) {
        this.complete(task.id, lastContent);
      }
      // Otherwise: last message isn't assistant content (e.g. tool
      // result). The agent may still be working — we'll catch
      // completion on the next idle event.
    } catch (error) {
      log("[manager] Failed to check session on idle", {
        id: task.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Handle a session.error event for a background session.
   */
  async handleSessionError(
    sessionId: string,
    errorMessage: string,
    metadata?: SessionErrorMetadata,
  ): Promise<void> {
    const taskId = this.tasksBySessionId.get(sessionId);
    if (!taskId) return;

    const task = this.tasks.get(taskId);
    if (!task || isTerminalStatus(task.status)) return;

    const ctx = this.ctxBySessionId.get(sessionId);
    const reason = classifyProviderFailure({
      errorMessage,
      rawError: metadata?.error,
    });

    if (ctx && reason) {
      const retried = await this.retryWithFallback(task, ctx, {
        reason,
        metadata,
        errorMessage,
      });
      if (retried) {
        return;
      }
    }

    // Only salvage output if the very last message is from the assistant.
    // Using getLastAssistantContent() here would scan the entire history
    // and could promote stale earlier text as a "success" result.
    if (ctx && task.sessionId) {
      try {
        const messagesResult = await ctx.client.session.messages({
          path: { id: task.sessionId },
        });
        const messages = (messagesResult.data ?? []) as SessionMessage[];
        if (messages.length > 0) {
          const lastMessage = messages[messages.length - 1];
          const lastContent = extractAssistantContent(lastMessage);
          if (lastContent && lastContent.trim().length > 0) {
            this.complete(task.id, lastContent);
            return;
          }
        }
      } catch {
        // Fall through to fail.
      }
    }

    this.fail(task.id, errorMessage);
  }

  private async retryWithFallback(
    task: BackgroundTask,
    ctx: OpenCodeContext,
    input: {
      reason: ProviderFailureReason;
      metadata?: SessionErrorMetadata;
      errorMessage: string;
    },
  ): Promise<boolean> {
    const currentRetries = task.retryCount ?? 0;
    if (currentRetries >= MAX_MODEL_SWITCH_RETRIES) {
      this.fail(
        task.id,
        `${input.errorMessage} (fallback retries exhausted after ${currentRetries} attempts)\n${formatFallbackDiagnostics(task)}`,
      );
      return true;
    }

    const attempted = new Set(
      (task.attemptedModels ?? []).map((model) => normalizeModel(model) ?? model),
    );
    const currentModel = normalizeModel(input.metadata?.model ?? task.model) ?? task.model;
    attempted.add(currentModel);

    const configuredCandidates = buildQualifiedFallbackModels(task.fallbackChain);
    const hookSuggested = normalizeModel(input.metadata?.retryWithModel);

    const mergedCandidates = [
      ...(hookSuggested ? [hookSuggested] : []),
      ...configuredCandidates,
    ].filter((candidate, index, array) => array.indexOf(candidate) === index);

    const orderedCandidates =
      input.reason === "quota" ? reorderForQuota(mergedCandidates, currentModel) : mergedCandidates;

    const nextModel = orderedCandidates.find((candidate) => !attempted.has(candidate));
    if (!nextModel) {
      this.fail(
        task.id,
        `${input.errorMessage} (no eligible fallback model available)\n${formatFallbackDiagnostics({
          ...task,
          attemptedModels: [...attempted],
        })}`,
      );
      return true;
    }

    const oldSessionId = task.sessionId;
    if (oldSessionId) {
      this.cleanupSessionIndex(oldSessionId);
      this.cleanupSession(oldSessionId);
      try {
        await ctx.client.session.delete({ path: { id: oldSessionId } });
      } catch (error) {
        log("[manager] Failed to delete session before fallback retry", {
          id: task.id,
          sessionId: oldSessionId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.releaseConcurrency(task);

    task.model = nextModel;
    task.sessionId = undefined;
    task.sessionStartedAt = undefined;
    task.retryCount = currentRetries + 1;
    task.attemptedModels = [...attempted, nextModel];
    task.status = "queued";

    log("[manager] Retrying background task with fallback model", {
      id: task.id,
      reason: input.reason,
      retryCount: task.retryCount,
      from: currentModel,
      to: nextModel,
    });

    void this.startTask(ctx, task, {
      id: task.id,
      prompt: task.prompt,
      model: task.model,
      parentSessionID: task.parentSessionID,
      title: task.title,
      fallbackChain: task.fallbackChain,
      delegationDepth: task.delegationDepth,
    });

    return true;
  }

  // ---------------------------------------------------------------------------
  // Promise-based waiting for background_output tool
  // ---------------------------------------------------------------------------

  /**
   * Wait for a task to reach a terminal state.
   * Returns immediately if already complete. Otherwise blocks until
   * the completion event fires or the timeout expires.
   */
  waitForCompletion(taskId: string, timeoutMs: number): Promise<BackgroundTask | undefined> {
    const task = this.tasks.get(taskId);
    if (!task) return Promise.resolve(undefined);
    if (isTerminalStatus(task.status)) return Promise.resolve(task);

    return new Promise<BackgroundTask | undefined>((resolve) => {
      const timer = setTimeout(() => {
        this.removeResolver(taskId, resolver);
        resolve(this.tasks.get(taskId));
      }, timeoutMs);

      const resolver: CompletionResolver = {
        resolve: (completed: BackgroundTask) => {
          clearTimeout(timer);
          resolve(completed);
        },
        timer,
      };

      const existing = this.completionResolvers.get(taskId) ?? [];
      existing.push(resolver);
      this.completionResolvers.set(taskId, existing);
    });
  }

  private removeResolver(taskId: string, resolver: CompletionResolver): void {
    const resolvers = this.completionResolvers.get(taskId);
    if (!resolvers) return;
    const idx = resolvers.indexOf(resolver);
    if (idx !== -1) resolvers.splice(idx, 1);
    if (resolvers.length === 0) this.completionResolvers.delete(taskId);
  }

  private notifyResolvers(task: BackgroundTask): void {
    const resolvers = this.completionResolvers.get(task.id);
    if (!resolvers || resolvers.length === 0) return;
    for (const resolver of resolvers) {
      clearTimeout(resolver.timer);
      resolver.resolve(task);
    }
    this.completionResolvers.delete(task.id);
  }

  // ---------------------------------------------------------------------------
  // Terminal state transitions
  // ---------------------------------------------------------------------------

  dispose(): void {
    // Resolve any waiting callers with current state.
    for (const [taskId] of this.completionResolvers) {
      const task = this.tasks.get(taskId);
      if (task) this.notifyResolvers(task);
    }
    this.completionResolvers.clear();
  }

  complete(id: string, result: string): void {
    const task = this.tasks.get(id);
    if (!task || isTerminalStatus(task.status)) return;

    task.status = "completed";
    task.result = result;
    task.completedAt = Date.now();
    this.releaseConcurrency(task);
    this.cleanupSessionIndex(task.sessionId);
    this.cleanupSession(task.sessionId);
    this.notifyResolvers(task);
    this.evictStaleTasks();
    log("[manager] Task completed", { id });
  }

  fail(id: string, error: string): void {
    const task = this.tasks.get(id);
    if (!task || isTerminalStatus(task.status)) return;

    task.status = "failed";
    task.error = error;
    task.completedAt = Date.now();
    this.releaseConcurrency(task);
    this.cleanupSessionIndex(task.sessionId);
    this.cleanupSession(task.sessionId);
    this.notifyResolvers(task);
    this.evictStaleTasks();
    log("[manager] Task failed", { id, error });
  }

  async cancel(ctx: OpenCodeContext, id: string): Promise<void> {
    const task = this.tasks.get(id);
    if (!task || isTerminalStatus(task.status)) return;

    const wasRunning = task.status === "running";
    task.status = "cancelled";
    task.completedAt = Date.now();

    if (wasRunning) {
      this.releaseConcurrency(task);
      if (task.sessionId) {
        try {
          await ctx.client.session.delete({ path: { id: task.sessionId } });
        } catch (error) {
          log("[manager] Failed to delete cancelled session", { id, error });
        }
      }
    }

    this.cleanupSessionIndex(task.sessionId);
    this.cleanupSession(task.sessionId);
    this.notifyResolvers(task);
    this.evictStaleTasks();
    log("[manager] Task cancelled", { id });
  }

  /**
   * Register a session that was already created by the sync delegate-task path.
   * Wires the session into the event-routing and waitForCompletion() machinery
   * without going through the normal concurrency queue.
   *
   * Must be called BEFORE sending the prompt so that the session.idle event
   * fired on completion is caught and resolves the waiting promise.
   */
  trackSyncSession(
    sessionId: string,
    taskId: string,
    ctx: OpenCodeContext,
    model: string,
    delegationDepth: number,
    options?: {
      prompt?: string;
      parentSessionID?: string;
      title?: string;
      fallbackChain?: FallbackEntry[];
    },
  ): void {
    const normalizedModel = normalizeModel(model) ?? model;
    const task: BackgroundTask = {
      id: taskId,
      status: "running",
      prompt: options?.prompt ?? "",
      model,
      title: options?.title,
      fallbackChain: options?.fallbackChain,
      retryCount: 0,
      attemptedModels: [normalizedModel],
      createdAt: Date.now(),
      startedAt: Date.now(),
      sessionStartedAt: Date.now(),
      sessionId,
      parentSessionID: options?.parentSessionID,
      delegationDepth,
      syncTask: true,
    };
    this.tasks.set(taskId, task);
    this.tasksBySessionId.set(sessionId, taskId);
    this.ctxBySessionId.set(sessionId, ctx);
    log("[manager] Sync session tracked", { taskId, sessionId });
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  /**
   * Build a concurrency key that includes delegation depth.
   * Each depth level gets its own concurrency pool, preventing parent tasks
   * from starving their children when sharing the same model.
   */
  private concurrencyKey(task: BackgroundTask): string {
    return `${task.model}:depth-${task.delegationDepth ?? 0}`;
  }

  private releaseConcurrency(task: BackgroundTask): void {
    if (task.syncTask) return;
    const poolKey = task.concurrencyPoolKey;
    if (!poolKey) return;
    this.concurrency.release(poolKey);
    task.concurrencyPoolKey = undefined;
  }

  private cleanupSessionIndex(sessionId: string | undefined): void {
    if (!sessionId) return;
    this.tasksBySessionId.delete(sessionId);
    this.ctxBySessionId.delete(sessionId);
  }

  private cleanupSession(sessionId: string | undefined): void {
    if (!sessionId) return;
    resetMessageCursor(sessionId);
    deleteSessionTools(sessionId);
  }

  private evictStaleTasks(): void {
    const now = Date.now();
    for (const [id, task] of this.tasks) {
      if (
        isTerminalStatus(task.status) &&
        task.completedAt &&
        now - task.completedAt > TASK_TTL_MS
      ) {
        this.tasks.delete(id);
      }
    }
  }

  get(id: string): BackgroundTask | undefined {
    return this.tasks.get(id);
  }

  getAll(): BackgroundTask[] {
    return [...this.tasks.values()];
  }

  /**
   * Returns the approximate queue position for a task.
   * Returns the total number of tasks waiting in the same concurrency pool,
   * or 0 if the task is not queued.
   */
  getQueuePosition(taskId: string): number {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== "queued") return 0;
    return this.concurrency.getQueueLength(this.concurrencyKey(task));
  }
}
