import type { CategoryConfig } from "../../types/category"
import {
  CategoryResolver,
  type CategoryOverrides,
  resolveCategory as resolveCategoryFromFeature,
} from "../../features/categories"

const resolver = new CategoryResolver()

export function resolveCategory(
  name: string,
  configOverrides?: CategoryOverrides,
): CategoryConfig | undefined {
  return resolver.resolve(name, configOverrides)
}

export function resolveCategoryWithDefaults(
  name: string,
  configOverrides?: CategoryOverrides,
): CategoryConfig | undefined {
  return resolveCategoryFromFeature(name, configOverrides)
}
