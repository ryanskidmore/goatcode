export const DEFAULT_TOOL_TIMEOUT_MS = 2_000;

export class ToolTimeoutError extends Error {
  readonly toolName: string;
  readonly timeoutMs: number;

  constructor(toolName: string, timeoutMs: number) {
    super(`Tool '${toolName}' timed out after ${timeoutMs}ms`);
    this.name = "ToolTimeoutError";
    this.toolName = toolName;
    this.timeoutMs = timeoutMs;
  }
}

export async function withToolTimeout<T>(
  toolName: string,
  timeoutMs: number,
  work: Promise<T>,
): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return work;
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ToolTimeoutError(toolName, timeoutMs)), timeoutMs);
  });

  try {
    // Timeout is caller-visible only. The underlying work promise is not forcibly
    // cancelled here because most tool handlers do not expose cooperative abort hooks.
    return await Promise.race([work, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
