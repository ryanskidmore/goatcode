import type { AvailableCategory } from "../../types/category";

export function buildCategoriesSection(categories: AvailableCategory[]): string {
  if (categories.length === 0) return "";

  const rows = categories.map((cat) => {
    const model = cat.model ?? "default";
    const safeDescription = cat.description.replace(/\|/g, "\\|");
    return `| \`${cat.name}\` | ${safeDescription} | ${model} |`;
  });

  return [
    "### Category Mapping",
    "",
    "Each category routes to a model optimized for that domain.",
    "",
    "| Category | Description | Model |",
    "|----------|-------------|-------|",
    ...rows,
  ].join("\n");
}
