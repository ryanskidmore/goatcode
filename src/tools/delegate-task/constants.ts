import type { CategoryConfig } from "./types";
import { CATEGORY_FALLBACK_CHAINS } from "../../agents/fallback-chains";

export const DEFAULT_CATEGORIES: Record<string, CategoryConfig> = {
  "visual-engineering": {
    model: "gemini-3.1-pro",
    variant: "high",
    description: "Frontend, UI/UX, design, styling, animation",
    fallback_chain: CATEGORY_FALLBACK_CHAINS["visual-engineering"],
  },
  ultrabrain: {
    model: "gpt-5.4",
    variant: "xhigh",
    description: "Hard logic, architecture decisions, complex reasoning",
    fallback_chain: CATEGORY_FALLBACK_CHAINS["ultrabrain"],
  },
  deep: {
    model: "gpt-5.3-codex",
    variant: "medium",
    description: "Goal-oriented autonomous problem-solving, deep research",
    fallback_chain: CATEGORY_FALLBACK_CHAINS["deep"],
  },
  artistry: {
    model: "gemini-3.1-pro",
    variant: "high",
    description: "Creative approaches, unconventional solutions",
    fallback_chain: CATEGORY_FALLBACK_CHAINS["artistry"],
  },
  quick: {
    model: "gpt-5.4-mini",
    description: "Trivial tasks, single file changes, typo fixes",
    fallback_chain: CATEGORY_FALLBACK_CHAINS["quick"],
  },
  "unspecified-low": {
    model: "claude-sonnet-4-6",
    description: "Moderate effort tasks that don't fit other categories",
    fallback_chain: CATEGORY_FALLBACK_CHAINS["unspecified-low"],
  },
  "unspecified-high": {
    model: "claude-opus-4-6",
    variant: "max",
    description: "High effort tasks that don't fit other categories",
    fallback_chain: CATEGORY_FALLBACK_CHAINS["unspecified-high"],
  },
  writing: {
    model: "gemini-3.1-flash-lite",
    description: "Documentation, prose, technical writing",
    fallback_chain: CATEGORY_FALLBACK_CHAINS["writing"],
  },
};

export const CATEGORY_NAMES = Object.keys(DEFAULT_CATEGORIES);

/**
 * Maximum allowed delegation depth. Prevents recursive delegation chains
 * where agents delegate to sub-agents that delegate further.
 *
 * Level 0: User → Orchestrator (can delegate)
 * Level 1: Orchestrator → Specialist (can delegate)
 * Level 2: Specialist → Sub-agent (CANNOT delegate further)
 */
export const MAX_DELEGATION_DEPTH = 2;
