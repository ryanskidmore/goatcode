/** All built-in GoatCode category names. */
export type BuiltinCategoryName =
  | "visual-engineering"
  | "ultrabrain"
  | "deep"
  | "artistry"
  | "quick"
  | "unspecified-low"
  | "unspecified-high"
  | "writing";

/** Category configuration. */
export interface CategoryConfig {
  /** Model to use for this category. */
  model?: string;
  /** Model variant (for example: high, max, xhigh). */
  variant?: string;
  /** Human-readable description. */
  description?: string;
  /** Additional system prompt text appended for this category. */
  prompt_append?: string;
}

/** Available category with resolved metadata. */
export interface AvailableCategory {
  /** Category name. */
  name: string;
  /** User-facing category description. */
  description: string;
  /** Resolved model for this category, if available. */
  model?: string;
}
