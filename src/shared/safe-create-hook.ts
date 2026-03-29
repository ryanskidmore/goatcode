import { log } from "./logger";

export function safeCreateHook<T>(
  name: string,
  factory: () => T,
  options?: { enabled?: boolean },
): T | null {
  if (options?.enabled === false) return null;
  try {
    return factory() ?? null;
  } catch (error) {
    log(`[safe-create-hook] Hook creation failed: ${name}`, { error });
    return null;
  }
}
