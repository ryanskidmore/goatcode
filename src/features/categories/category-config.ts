import type { CategoryConfig } from "../../types/category"
import { CATEGORY_PROMPT_APPENDS } from "./prompt-appends"

export type CategoryName =
  | "visual-engineering"
  | "ultrabrain"
  | "deep"
  | "artistry"
  | "quick"
  | "unspecified-low"
  | "unspecified-high"
  | "writing"

export interface CategoryDefinition extends Required<Pick<CategoryConfig, "description">> {
  name: CategoryName
  model: string
  variant?: string
  promptAppend?: string
}

export const DEFAULT_CATEGORY_DEFINITIONS: Record<CategoryName, CategoryDefinition> = {
  "visual-engineering": {
    name: "visual-engineering",
    model: "google/gemini-3.1-pro",
    variant: "high",
    description: "Frontend, UI/UX, design, styling, animation",
    promptAppend: CATEGORY_PROMPT_APPENDS["visual-engineering"],
  },
  ultrabrain: {
    name: "ultrabrain",
    model: "openai/gpt-5.4",
    variant: "xhigh",
    description: "Hard logic, architecture decisions, complex reasoning",
    promptAppend: CATEGORY_PROMPT_APPENDS.ultrabrain,
  },
  deep: {
    name: "deep",
    model: "openai/gpt-5.3-codex",
    variant: "medium",
    description: "Goal-oriented autonomous problem solving",
    promptAppend: CATEGORY_PROMPT_APPENDS.deep,
  },
  artistry: {
    name: "artistry",
    model: "google/gemini-3.1-pro",
    variant: "high",
    description: "Creative approaches and unconventional solutions",
    promptAppend: CATEGORY_PROMPT_APPENDS.artistry,
  },
  quick: {
    name: "quick",
    model: "openai/gpt-5.4-mini",
    description: "Trivial tasks and small single-file changes",
    promptAppend: CATEGORY_PROMPT_APPENDS.quick,
  },
  "unspecified-low": {
    name: "unspecified-low",
    model: "anthropic/claude-sonnet-4-6",
    description: "Moderate effort tasks outside specialized categories",
    promptAppend: CATEGORY_PROMPT_APPENDS["unspecified-low"],
  },
  "unspecified-high": {
    name: "unspecified-high",
    model: "anthropic/claude-opus-4-6",
    variant: "max",
    description: "High effort tasks outside specialized categories",
    promptAppend: CATEGORY_PROMPT_APPENDS["unspecified-high"],
  },
  writing: {
    name: "writing",
    model: "kimi-for-coding/k2p5",
    description: "Documentation, prose, and technical writing",
    promptAppend: CATEGORY_PROMPT_APPENDS.writing,
  },
}

export const DEFAULT_CATEGORIES: Record<CategoryName, CategoryConfig> = Object.fromEntries(
  Object.entries(DEFAULT_CATEGORY_DEFINITIONS).map(([name, definition]) => [
    name,
    {
      model: definition.model,
      variant: definition.variant,
      description: definition.description,
      prompt_append: definition.promptAppend,
    },
  ]),
) as Record<CategoryName, CategoryConfig>
