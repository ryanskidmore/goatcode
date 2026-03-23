import type { CategoryConfig, CategoryResolver } from "./types"
import { DEFAULT_CATEGORIES, CATEGORY_NAMES } from "./constants"

export function createCategoryResolver(): CategoryResolver {
  return {
    resolve(categoryName: string): CategoryConfig | undefined {
      return DEFAULT_CATEGORIES[categoryName]
    },
    list(): string[] {
      return CATEGORY_NAMES
    },
  }
}
