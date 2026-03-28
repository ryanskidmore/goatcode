export {
  DEFAULT_MAX_ITERATIONS,
  UNBOUNDED_MAX_ITERATIONS,
  type LoopOptions,
  type LoopState,
  type LoopStore,
} from "./state"
export { MemoryLoopStore } from "./memory-store"
export { FileLoopStore } from "./file-store"
export { buildLoopContinuationMessage, createLoopHandler, type LoopHandlerOptions } from "./handler"
export {
  clearLoopStateForTests,
  configureLoopStateFilePathForTests,
  createLoopPlugin,
  defaultLoopStore,
  fileLoopStore,
  getLoopState,
  isLoopActive,
  loadPersistedLoopStateForTests,
  loopPlugin,
  memoryLoopStore,
  startLoop,
  stopLoop,
} from "./plugin"
