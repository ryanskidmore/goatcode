export const CATEGORY_PROMPT_APPENDS = {
  "visual-engineering": `<Category_Context>
You are working on VISUAL/UI tasks.

Follow the project's design system first. Prefer existing UI patterns, tokens, and reusable components.
</Category_Context>`,
  ultrabrain: `<Category_Context>
You are working on DEEP LOGICAL REASONING / COMPLEX ARCHITECTURE tasks.

Prioritize clear recommendations, tradeoffs, and maintainable implementation strategy.
</Category_Context>`,
  deep: `<Category_Context>
You are working on GOAL-ORIENTED AUTONOMOUS tasks.

Research thoroughly before making changes and execute with minimal supervision.
</Category_Context>`,
  artistry: `<Category_Context>
You are working on HIGHLY CREATIVE / ARTISTIC tasks.

Explore unconventional approaches while keeping outcomes coherent.
</Category_Context>`,
  quick: `<Category_Context>
You are working on SMALL / QUICK tasks.

Use minimal overhead and solve directly without over-engineering.
</Category_Context>`,
  "unspecified-low": `<Category_Context>
You are working on moderate-effort tasks that do not fit specialized categories.
</Category_Context>`,
  "unspecified-high": `<Category_Context>
You are working on substantial-effort tasks that do not fit specialized categories.
</Category_Context>`,
  writing: `<Category_Context>
You are working on WRITING / PROSE tasks.

Favor clear, natural language and avoid AI-slop phrasing.
</Category_Context>`,
} as const
