import type { CategoryConfig } from "./types";

export const DEFAULT_CATEGORIES: Record<string, CategoryConfig> = {
  "visual-engineering": {
    model: "gemini-3.1-pro",
    variant: "high",
    description: "Frontend, UI/UX, design, styling, animation",
  },
  ultrabrain: {
    model: "gpt-5.4",
    variant: "xhigh",
    description: "Hard logic, architecture decisions, complex reasoning",
  },
  deep: {
    model: "gpt-5.3-codex",
    variant: "medium",
    description: "Goal-oriented autonomous problem-solving, deep research",
  },
  artistry: {
    model: "gemini-3.1-pro",
    variant: "high",
    description: "Creative approaches, unconventional solutions",
  },
  quick: {
    model: "gpt-5.4-mini",
    description: "Trivial tasks, single file changes, typo fixes",
  },
  "unspecified-low": {
    model: "claude-sonnet-4-6",
    description: "Moderate effort tasks that don't fit other categories",
  },
  "unspecified-high": {
    model: "claude-opus-4-6",
    variant: "max",
    description: "High effort tasks that don't fit other categories",
  },
  writing: {
    model: "kimi-for-coding/k2p5",
    description: "Documentation, prose, technical writing",
  },
};

export const CATEGORY_NAMES = Object.keys(DEFAULT_CATEGORIES);
