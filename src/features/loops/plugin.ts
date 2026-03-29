import { definePlugin } from "../../plugin-api";
import { safeCreateHook } from "../../shared/safe-create-hook";
import { FileLoopStore } from "./file-store";
import { createLoopHandler, type LoopHandlerOptions } from "./handler";
import { MemoryLoopStore } from "./memory-store";
import { type LoopOptions, type LoopState, type LoopStore } from "./state";

class RoutedLoopStore implements LoopStore {
  constructor(
    private readonly memoryStore: MemoryLoopStore,
    private readonly fileStore: FileLoopStore,
  ) {}

  startLoop(sessionId: string, options?: LoopOptions): void {
    if (options?.persist) {
      this.memoryStore.stopLoop(sessionId);
      this.fileStore.startLoop(sessionId, options);
      return;
    }

    this.fileStore.stopLoop(sessionId);
    this.memoryStore.startLoop(sessionId, options);
  }

  stopLoop(sessionId: string): void {
    this.fileStore.stopLoop(sessionId);
    this.memoryStore.stopLoop(sessionId);
  }

  isActive(sessionId: string): boolean {
    return this.fileStore.isActive(sessionId) || this.memoryStore.isActive(sessionId);
  }

  getLoopState(sessionId: string): LoopState | undefined {
    return this.fileStore.getLoopState(sessionId) ?? this.memoryStore.getLoopState(sessionId);
  }

  incrementIteration(sessionId: string): void {
    this.fileStore.incrementIteration(sessionId);
    this.memoryStore.incrementIteration(sessionId);
  }

  markCompletionDetected(sessionId: string): void {
    this.fileStore.markCompletionDetected(sessionId);
    this.memoryStore.markCompletionDetected(sessionId);
  }

  clearForTests(clearPersistedFile = false): void {
    this.memoryStore.clearAllForTests();
    this.fileStore.clearAllForTests(clearPersistedFile);
  }

  configureFilePathForTests(filePath: string): void {
    this.fileStore.setStateFilePathForTests(filePath);
  }

  loadPersistedForTests(): void {
    this.fileStore.loadPersistedStateForTests();
  }
}

export const memoryLoopStore = new MemoryLoopStore();
export const fileLoopStore = new FileLoopStore();
export const defaultLoopStore = new RoutedLoopStore(memoryLoopStore, fileLoopStore);

export function startLoop(sessionId: string, options?: LoopOptions): void {
  defaultLoopStore.startLoop(sessionId, options);
}

export function stopLoop(sessionId: string): void {
  defaultLoopStore.stopLoop(sessionId);
}

export function isLoopActive(sessionId: string): boolean {
  return defaultLoopStore.isActive(sessionId);
}

export function getLoopState(sessionId: string): LoopState | undefined {
  return defaultLoopStore.getLoopState(sessionId);
}

export function clearLoopStateForTests(clearPersistedFile = false): void {
  defaultLoopStore.clearForTests(clearPersistedFile);
}

export function configureLoopStateFilePathForTests(filePath: string): void {
  defaultLoopStore.configureFilePathForTests(filePath);
}

export function loadPersistedLoopStateForTests(): void {
  defaultLoopStore.loadPersistedForTests();
}

export function createLoopPlugin(options?: LoopHandlerOptions) {
  const eventHook = safeCreateHook("loop", () => createLoopHandler(defaultLoopStore, options));

  return definePlugin({
    name: "loop",
    version: "0.1.0",
    hooks: eventHook ? { event: eventHook } : {},
  });
}

/**
 * Default plugin registration. The host injects sendContinuationMessage at runtime via createLoopPlugin().
 */
export const loopPlugin = createLoopPlugin();
