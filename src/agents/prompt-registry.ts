import type { BuiltinAgentName } from "../types/agent"
import type { PromptMeta } from "./prompt-meta"
import { ORCHESTRATOR_PROMPT_META } from "./orchestrator/prompt-meta"
import { DEEP_WORKER_PROMPT_META } from "./deep-worker/prompt-meta"
import { PLAN_BUILDER_PROMPT_META } from "./plan-builder/prompt-meta"
import { ADVISOR_PROMPT_META } from "./advisor/prompt-meta"
import { RESEARCHER_PROMPT_META } from "./researcher/prompt-meta"
import { EXPLORER_PROMPT_META } from "./explorer/prompt-meta"
import { WORKER_PROMPT_META } from "./worker/prompt-meta"
export const PROMPT_REGISTRY: Record<BuiltinAgentName, PromptMeta> = {
  orchestrator: ORCHESTRATOR_PROMPT_META,
  "deep-worker": DEEP_WORKER_PROMPT_META,
  "plan-builder": PLAN_BUILDER_PROMPT_META,
  advisor: ADVISOR_PROMPT_META,
  researcher: RESEARCHER_PROMPT_META,
  explorer: EXPLORER_PROMPT_META,
  worker: WORKER_PROMPT_META,
}

export function getPromptVersion(agentName: BuiltinAgentName): string {
  return PROMPT_REGISTRY[agentName].version
}
