import type { PluginDefinition } from "../types/plugin"
import { thinkingBlockValidatorPlugin } from "./thinking-block-validator/plugin"
import { contextInjectorPlugin } from "./context-injector/plugin"
import { hashlineReadEnhancerPlugin } from "./hashline-read-enhancer/plugin"
import { toolOutputTruncatorPlugin } from "./tool-output-truncator/plugin"
import { todoEnforcerPlugin } from "./todo-enforcer/plugin"
import { delegateRetryPlugin } from "./delegate-retry/plugin"
import { editErrorPlugin } from "./edit-error/plugin"
import { keywordDetectorPlugin } from "./keyword-detector/plugin"
import { preemptiveCompactionPlugin } from "./preemptive-compaction/plugin"
import { anthropicEffortPlugin } from "./anthropic-effort/plugin"
import { modelFallbackPlugin } from "./model-fallback/plugin"
import { taskResumeInfoPlugin } from "./task-resume-info/plugin"
import { commentCheckerPlugin } from "./comment-checker/plugin"
import { thinkModePlugin } from "./think-mode/plugin"
import { contextWindowLimitPlugin } from "./context-window-limit/plugin"
import { runtimeFallbackPlugin } from "./runtime-fallback/plugin"
import { stopGuardPlugin } from "./stop-guard/plugin"
import { hashlineDiffEnhancerPlugin } from "./hashline-diff-enhancer/plugin"
import { compactionContextPlugin } from "./compaction-context/plugin"
import { sessionRecoveryPlugin } from "./session-recovery/plugin"
import { emptyResponseDetectorPlugin } from "./empty-response-detector/plugin"
import { jsonErrorPlugin } from "./json-error/plugin"
import { todowriteDisablerPlugin } from "./todowrite-disabler/plugin"
import { compactionTodoPreserverPlugin } from "./compaction-todo-preserver/plugin"
import { writeFileGuardPlugin } from "./write-file-guard/plugin"
import { foregroundFallbackPlugin } from "./foreground-fallback"
import { phaseReminderPlugin } from "./phase-reminder"
import { postReadNudgePlugin } from "./post-read-nudge"

export const BUILTIN_HOOK_PLUGINS: PluginDefinition[] = [
  thinkingBlockValidatorPlugin,
  contextInjectorPlugin,
  hashlineReadEnhancerPlugin,
  toolOutputTruncatorPlugin,
  todoEnforcerPlugin,
  delegateRetryPlugin,
  editErrorPlugin,
  keywordDetectorPlugin,
  preemptiveCompactionPlugin,
  anthropicEffortPlugin,
  modelFallbackPlugin,
  taskResumeInfoPlugin,
  commentCheckerPlugin,
  thinkModePlugin,
  contextWindowLimitPlugin,
  runtimeFallbackPlugin,
  stopGuardPlugin,
  hashlineDiffEnhancerPlugin,
  compactionContextPlugin,
  sessionRecoveryPlugin,
  emptyResponseDetectorPlugin,
  jsonErrorPlugin,
  todowriteDisablerPlugin,
  compactionTodoPreserverPlugin,
  writeFileGuardPlugin,
  foregroundFallbackPlugin,
  phaseReminderPlugin,
  postReadNudgePlugin,
]
