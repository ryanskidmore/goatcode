export type BackgroundTaskStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export interface BackgroundTask {
  id: string;
  sessionId?: string;
  status: BackgroundTaskStatus;
  prompt: string;
  model: string;
  createdAt: number;
  startedAt?: number;
  /** Timestamp when the background session was actually created (after spawn). */
  sessionStartedAt?: number;
  completedAt?: number;
  result?: string;
  error?: string;
}

export interface LaunchInput {
  id: string;
  prompt: string;
  model: string;
  parentSessionID?: string;
  title?: string;
  fallbackChain?: Array<{ providers: string[]; model: string; variant?: string }>;
}
