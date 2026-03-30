import { getDiscovery, type ProviderModelEntry } from "./provider-discovery";

export interface ProviderResolutionResult {
  readonly qualifiedModel: string;
  readonly providerId: string;
}

const DEFAULT_PROVIDER_PRIORITY = ["anthropic", "openai", "google", "opencode"] as const;

let providerPriority: string[] = [...DEFAULT_PROVIDER_PRIORITY];
let defaultPreferredProvider: string | undefined;
const customModelMaps = new Map<string, Map<string, string>>();

function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase();
}

function normalizePriorityList(priority: readonly string[]): string[] {
  const deduped = new Set<string>();
  for (const providerId of priority) {
    const normalized = normalizeIdentifier(providerId);
    if (normalized) deduped.add(normalized);
  }
  return deduped.size > 0 ? [...deduped] : [...DEFAULT_PROVIDER_PRIORITY];
}

function providerRank(providerId: string): number {
  const idx = providerPriority.indexOf(providerId);
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
}

function sortByPriority(entries: ProviderModelEntry[]): ProviderModelEntry[] {
  return [...entries].sort((a, b) => {
    const byRank = providerRank(a.providerId) - providerRank(b.providerId);
    if (byRank !== 0) return byRank;
    return a.providerId.localeCompare(b.providerId);
  });
}

function getProviderSpecificModelId(providerId: string, modelId: string): string {
  const modelMap = customModelMaps.get(providerId);
  if (!modelMap) return modelId;
  return modelMap.get(modelId) ?? modelId;
}

export function setProviderPriority(priority: string[]): void {
  providerPriority = normalizePriorityList(priority);
}

export function getProviderPriority(): readonly string[] {
  return [...providerPriority];
}

export function setDefaultPreferredProvider(provider: string | undefined): void {
  defaultPreferredProvider = provider ? normalizeIdentifier(provider) : undefined;
}

export function getDefaultPreferredProvider(): string | undefined {
  return defaultPreferredProvider;
}

export function registerProviderModelMap(providerId: string, modelMap: Record<string, string>): void {
  const providerKey = normalizeIdentifier(providerId);
  if (!providerKey) return;

  const normalizedMap = new Map<string, string>();
  for (const [canonicalModelId, providerModelId] of Object.entries(modelMap)) {
    const canonical = normalizeIdentifier(canonicalModelId);
    const providerSpecific = normalizeIdentifier(providerModelId);
    if (canonical && providerSpecific) {
      normalizedMap.set(canonical, providerSpecific);
    }
  }

  customModelMaps.set(providerKey, normalizedMap);
}

export function unregisterProviderModelMap(providerId: string): boolean {
  return customModelMaps.delete(normalizeIdentifier(providerId));
}

export function isQualifiedModel(model: string): boolean {
  return model.includes("/");
}

export function findProvidersForModel(bareModel: string): ProviderModelEntry[] {
  const normalizedModel = normalizeIdentifier(bareModel);
  if (!normalizedModel) return [];

  const discovery = getDiscovery();
  if (!discovery) return [];

  const entries = discovery.modelIndex.get(normalizedModel) ?? [];
  const connectedEntries = entries.filter((entry) => discovery.connectedProviders.has(entry.providerId));

  return sortByPriority(connectedEntries);
}

export function resolveProvider(
  model: string,
  preferredProvider?: string,
): ProviderResolutionResult | undefined {
  const trimmed = normalizeIdentifier(model);
  if (!trimmed) return undefined;

  if (isQualifiedModel(trimmed)) {
    const slashIdx = trimmed.indexOf("/");
    return {
      qualifiedModel: trimmed,
      providerId: trimmed.slice(0, slashIdx),
    };
  }

  const candidates = findProvidersForModel(trimmed);
  if (candidates.length === 0) return undefined;

  const preferred = normalizeIdentifier(preferredProvider ?? defaultPreferredProvider ?? "");
  const selected = preferred
    ? candidates.find((candidate) => candidate.providerId === preferred) ?? candidates[0]
    : candidates[0];

  if (!selected) return undefined;

  const providerModelId = getProviderSpecificModelId(selected.providerId, selected.modelId);
  return {
    qualifiedModel: `${selected.providerId}/${providerModelId}`,
    providerId: selected.providerId,
  };
}

export function qualifyModel(model: string, preferredProvider?: string): string {
  const result = resolveProvider(model, preferredProvider);
  return result?.qualifiedModel ?? model;
}
