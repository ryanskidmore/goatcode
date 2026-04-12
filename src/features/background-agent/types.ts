export type BackgroundTaskStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export interface BackgroundTask {
  id: string;
  sessionId?: string;
  status: BackgroundTaskStatus;
  prompt: string;
  model: string;
  title?: string;
  fallbackChain?: Array<{ providers: string[]; model: string; variant?: string }>;
  retryCount?: number;
  attemptedModels?: string[];
  concurrencyPoolKey?: string;
  createdAt: number;
  startedAt?: number;
  /** Timestamp when the background session was actually created (after spawn). */
  sessionStartedAt?: number;
  completedAt?: number;
  result?: string;
  error?: string;
  /** Session ID of the parent that launched this task. Used for scoped cancellation. */
  parentSessionID?: string;
  /** Delegation depth of this task. Used for hierarchical concurrency pooling. */
  delegationDepth?: number;
  /**
   * True for sync delegate-task invocations that bypass the normal concurrency
   * queue. These tasks must not release a concurrency slot on completion because
   * they never acquired one.
   */
  syncTask?: boolean;
}

export interface LaunchInput {
  id: string;
  prompt: string;
  model: string;
  parentSessionID?: string;
  title?: string;
  fallbackChain?: Array<{ providers: string[]; model: string; variant?: string }>;
  /** Delegation depth of the child task. Used for hierarchical concurrency pooling. */
  delegationDepth?: number;
}
