export function isModelAvailable(model: string, availableModels: Set<string>): boolean {
  if (availableModels.size === 0) return true;
  const normalized = model.toLowerCase().trim();
  if (availableModels.has(normalized)) return true;

  for (const available of availableModels) {
    const longer = available.length > normalized.length ? available : normalized;
    const shorter = available.length <= normalized.length ? available : normalized;
    if (
      longer.startsWith(shorter) &&
      (longer.length === shorter.length || /[/\-.]/.test(longer[shorter.length]!))
    ) {
      return true;
    }
  }

  return false;
}
