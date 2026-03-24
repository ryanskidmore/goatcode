import type { CategoryConfig } from "../../types/category"
import { log } from "../../shared/logger"
import { DEFAULT_CATEGORIES, type CategoryName } from "./category-config"

export type CategoryOverrides = Partial<Record<CategoryName, CategoryConfig>>

export class CategoryResolver {
  resolve(name: string, configOverrides?: CategoryOverrides): CategoryConfig | undefined {
    const categoryName = name as CategoryName
    const baseConfig = DEFAULT_CATEGORIES[categoryName]
    if (!baseConfig) {
      log(`[category-resolver] Unknown category: ${name}`)
      return undefined
    }

    const override = configOverrides?.[categoryName]
    if (!override) {
      return { ...baseConfig }
    }

    return {
      model: override.model ?? baseConfig.model,
      variant: override.variant ?? baseConfig.variant,
      description: override.description ?? baseConfig.description,
      prompt_append: override.prompt_append ?? baseConfig.prompt_append,
    }
  }
}

export function resolveCategory(
  name: string,
  configOverrides?: CategoryOverrides,
): CategoryConfig | undefined {
  const resolver = new CategoryResolver()
  return resolver.resolve(name, configOverrides)
}
