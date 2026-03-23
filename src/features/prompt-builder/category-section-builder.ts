import type { AvailableCategory } from "../../types/category"

export function buildCategoriesSection(categories: AvailableCategory[]): string {
  if (categories.length === 0) return ""

  const rows = categories.map((cat) => {
    const model = cat.model ?? "default"
    return `| \`${cat.name}\` | ${cat.description} | ${model} |`
  })

  return [
    "### Category Mapping",
    "",
    "Each category routes to a model optimized for that domain.",
    "",
    "| Category | Description | Model |",
    "|----------|-------------|-------|",
    ...rows,
  ].join("\n")
}
