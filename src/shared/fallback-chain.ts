export function buildFallbackChain(
  configFallbacks: string | string[] | undefined,
  defaultChain: string[],
): string[] {
  if (!configFallbacks) return defaultChain;
  const overrides = Array.isArray(configFallbacks) ? configFallbacks : [configFallbacks];
  return [...overrides, ...defaultChain.filter((m) => !overrides.includes(m))];
}
