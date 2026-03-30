import type { BuiltinCategoryName, CategoryConfig } from "../../types/category";
import { CATEGORY_PROMPT_APPENDS } from "./prompt-appends";

export type CategoryName = BuiltinCategoryName;

export interface CategoryDefinition extends Required<Pick<CategoryConfig, "description">> {
  model: string;
  variant?: string;
  promptAppend?: string;
}

export const DEFAULT_CATEGORY_DEFINITIONS: Record<CategoryName, CategoryDefinition> = {
  "visual-engineering": {
    model: "gemini-3.1-pro",
    variant: "high",
    description: "Frontend, UI/UX, design, styling, animation",
    promptAppend: CATEGORY_PROMPT_APPENDS["visual-engineering"],
  },
  ultrabrain: {
    model: "gpt-5.4",
    variant: "xhigh",
    description: "Hard logic, architecture decisions, complex reasoning",
    promptAppend: CATEGORY_PROMPT_APPENDS.ultrabrain,
  },
  deep: {
    model: "gpt-5.3-codex",
    variant: "medium",
    description: "Goal-oriented autonomous problem solving",
    promptAppend: CATEGORY_PROMPT_APPENDS.deep,
  },
  artistry: {
    model: "gemini-3.1-pro",
    variant: "high",
    description: "Creative approaches and unconventional solutions",
    promptAppend: CATEGORY_PROMPT_APPENDS.artistry,
  },
  quick: {
    model: "gpt-5.4-mini",
    description: "Trivial tasks and small single-file changes",
    promptAppend: CATEGORY_PROMPT_APPENDS.quick,
  },
  "unspecified-low": {
    model: "claude-sonnet-4-6",
    description: "Moderate effort tasks outside specialized categories",
    promptAppend: CATEGORY_PROMPT_APPENDS["unspecified-low"],
  },
  "unspecified-high": {
    model: "claude-opus-4-6",
    variant: "max",
    description: "High effort tasks outside specialized categories",
    promptAppend: CATEGORY_PROMPT_APPENDS["unspecified-high"],
  },
  writing: {
    model: "gemini-3.1-flash-lite",
    description: "Documentation, prose, technical writing",
    promptAppend: CATEGORY_PROMPT_APPENDS.writing,
  },
};

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
) as Record<CategoryName, CategoryConfig>;
