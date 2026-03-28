import type { BuiltinAgentName } from "../types/agent"
import type { PromptMeta } from "./prompt-meta"
import { ORCHESTRATOR_PROMPT_META } from "./orchestrator/prompt-meta"
import { DEEP_WORKER_PROMPT_META } from "./deep-worker/prompt-meta"
import { PLAN_BUILDER_PROMPT_META } from "./plan-builder/prompt-meta"
import { ADVISOR_PROMPT_META } from "./advisor/prompt-meta"
import { RESEARCHER_PROMPT_META } from "./researcher/prompt-meta"
import { EXPLORER_PROMPT_META } from "./explorer/prompt-meta"
import { WORKER_PROMPT_META } from "./worker/prompt-meta"

function createInitialPromptMeta(summary: string): PromptMeta {
  return {
    version: "1.0.0",
    date: "2025-03-28",
    summary,
    changelog: [
      {
        version: "1.0.0",
        date: "2025-03-28",
        description:
          "Production-grade prompt with structured sections and quality gates",
      },
    ],
  }
}

export const PROMPT_REGISTRY: Record<BuiltinAgentName, PromptMeta> = {
  orchestrator: ORCHESTRATOR_PROMPT_META,
  "deep-worker": DEEP_WORKER_PROMPT_META,
  "plan-builder": PLAN_BUILDER_PROMPT_META,
  advisor: ADVISOR_PROMPT_META,
  researcher: RESEARCHER_PROMPT_META,
  explorer: EXPLORER_PROMPT_META,
  worker: WORKER_PROMPT_META,
  executor: createInitialPromptMeta(
    "Follows explicit execution plans with disciplined step tracking.",
  ),
  analyst: createInitialPromptMeta(
    "Performs implementation gap analysis and risk identification.",
  ),
  reviewer: createInitialPromptMeta(
    "Validates completed work against requirements and quality bars.",
  ),
  inspector: createInitialPromptMeta(
    "Extracts structured insights from multimodal artifacts.",
  ),
}

export function getPromptVersion(agentName: BuiltinAgentName): string {
  return PROMPT_REGISTRY[agentName].version
}
