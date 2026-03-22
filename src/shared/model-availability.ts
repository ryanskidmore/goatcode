export function isModelAvailable(model: string, availableModels: Set<string>): boolean {
  if (availableModels.size === 0) return true // no constraint = all available
  const normalized = model.toLowerCase().trim()
  if (availableModels.has(normalized)) return true
  // fuzzy: check if any available model starts with same provider/model prefix
  for (const available of availableModels) {
    if (available.startsWith(normalized) || normalized.startsWith(available)) return true
  }
  return false
}
