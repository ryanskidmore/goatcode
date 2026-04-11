export {
  POLLING_INTERVAL_MS,
  STABILITY_REQUIRED_POLLS,
  createPollState,
  checkStability,
  pollUntilStable,
  initBackgroundAgent,
  getBackgroundAgent,
  resetBackgroundAgent,
  BackgroundAgentManager,
  createBackgroundAgentEventHook,
} from "../features/background-agent";

export type {
  BackgroundTask,
  BackgroundTaskStatus,
  LaunchInput,
} from "../features/background-agent";
export type { PollState, PollSnapshot } from "../features/background-agent/poller";

export {
  setSessionState,
  getSessionState,
  deleteSessionState,
  clearSessionStore,
  consumeNewMessages,
  resetMessageCursor,
  setSessionTools,
  getSessionTools,
  deleteSessionTools,
  clearSessionTools,
} from "../features/session-state";

export type { SessionState, CursorMessage } from "../features/session-state";

export {
  DEFAULT_CATEGORIES,
  DEFAULT_CATEGORY_DEFINITIONS,
  CategoryResolver,
  resolveCategory,
  CATEGORY_PROMPT_APPENDS,
} from "../features/categories";

export type { CategoryDefinition, CategoryName, CategoryOverrides } from "../features/categories";
