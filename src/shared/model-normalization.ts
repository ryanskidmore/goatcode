export function normalizeModel(model: string | undefined): string | undefined {
  if (!model) return undefined;
  const trimmed = model.trim();
  if (!trimmed) return undefined;
  return trimmed.toLowerCase();
}

export function parseModelId(model: string): { provider: string; modelId: string } | undefined {
  const normalized = normalizeModel(model);
  if (!normalized) return undefined;
  const slashIndex = normalized.indexOf("/");
  if (slashIndex === -1) return undefined;
  return {
    provider: normalized.slice(0, slashIndex),
    modelId: normalized.slice(slashIndex + 1),
  };
}
