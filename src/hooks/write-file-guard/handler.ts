import type { PluginHookHandler } from "../../types/plugin";
import { existsSync } from "node:fs";
import { isAbsolute, normalize, resolve } from "node:path";
import { log } from "../../shared/logger";

const MAX_TRACKED_SESSIONS = 256;
const MAX_PATHS_PER_SESSION = 1024;
const BLOCK_MESSAGE = "File already exists. Read the file before writing to it.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getFilePath(args: Record<string, unknown>): string | undefined {
  const p = args.filePath ?? args.file_path ?? args.path;
  return typeof p === "string" ? p : undefined;
}

function resolvePath(filePath: string, directory: string): string {
  const abs = isAbsolute(filePath) ? filePath : resolve(directory, filePath);
  return normalize(abs);
}

export function createWriteFileGuardHandler(directory: string): {
  preToolUse: PluginHookHandler;
  event: PluginHookHandler;
} {
  const readsBySession = new Map<string, Set<string>>();
  const sessionAccess = new Map<string, number>();

  function touchSession(sessionId: string): void {
    sessionAccess.set(sessionId, Date.now());
  }

  function evictOldestSession(): void {
    let oldest: string | undefined;
    let oldestTime = Number.POSITIVE_INFINITY;
    for (const [id, time] of sessionAccess.entries()) {
      if (time < oldestTime) {
        oldestTime = time;
        oldest = id;
      }
    }
    if (oldest) {
      readsBySession.delete(oldest);
      sessionAccess.delete(oldest);
    }
  }

  function getOrCreateReadSet(sessionId: string): Set<string> {
    let set = readsBySession.get(sessionId);
    if (!set) {
      if (readsBySession.size >= MAX_TRACKED_SESSIONS) {
        evictOldestSession();
      }
      set = new Set<string>();
      readsBySession.set(sessionId, set);
    }
    touchSession(sessionId);
    return set;
  }

  function trimReadSet(set: Set<string>): void {
    while (set.size > MAX_PATHS_PER_SESSION) {
      const first = set.values().next().value;
      if (first === undefined) break;
      set.delete(first);
    }
  }

  function registerRead(sessionId: string, canonicalPath: string): void {
    const set = getOrCreateReadSet(sessionId);
    set.delete(canonicalPath);
    set.add(canonicalPath);
    trimReadSet(set);
  }

  function consumeRead(sessionId: string, canonicalPath: string): boolean {
    const set = readsBySession.get(sessionId);
    if (!set || !set.has(canonicalPath)) {
      return false;
    }
    set.delete(canonicalPath);
    touchSession(sessionId);
    return true;
  }

  const preToolUse: PluginHookHandler = async (input: unknown, output: unknown) => {
    if (!isRecord(input) || !isRecord(output)) {
      return;
    }

    const tool = input.tool;
    if (typeof tool !== "string") {
      return;
    }

    const toolLower = tool.toLowerCase();
    if (toolLower !== "write" && toolLower !== "read") {
      return;
    }

    const args = isRecord(output.args) ? output.args : output;
    const rawPath = getFilePath(args);
    if (!rawPath) {
      return;
    }

    const sessionId = typeof input.sessionID === "string" ? input.sessionID : undefined;
    const canonicalPath = resolvePath(rawPath, directory);

    if (toolLower === "read") {
      if (!existsSync(canonicalPath) || !sessionId) {
        return;
      }
      registerRead(sessionId, canonicalPath);
      return;
    }

    if (!existsSync(canonicalPath)) {
      return;
    }

    if (canonicalPath.includes("/.sisyphus/")) {
      log("[write-file-guard] allowing .sisyphus/** overwrite", { sessionId, canonicalPath });
      return;
    }

    if (sessionId && consumeRead(sessionId, canonicalPath)) {
      log("[write-file-guard] allowing write after read", { sessionId, canonicalPath });
      return;
    }

    log("[write-file-guard] blocking write to existing file without prior read", {
      sessionId,
      canonicalPath,
    });

    throw new Error(BLOCK_MESSAGE);
  };

  const event: PluginHookHandler = async (input: unknown) => {
    if (!isRecord(input)) {
      return;
    }

    const evt = isRecord(input.event) ? input.event : input;
    if (evt.type !== "session.deleted") {
      return;
    }

    const props = isRecord(evt.properties) ? evt.properties : undefined;
    const info = isRecord(props?.info) ? props.info : undefined;
    const sessionId = typeof info?.id === "string" ? info.id : undefined;
    if (!sessionId) {
      return;
    }

    readsBySession.delete(sessionId);
    sessionAccess.delete(sessionId);
  };

  return { preToolUse, event };
}

export { BLOCK_MESSAGE };
