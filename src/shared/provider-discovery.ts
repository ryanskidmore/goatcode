export type ProviderListResponse = {
  readonly all: readonly {
    readonly id: string;
    readonly name: string;
    readonly env: readonly string[];
    readonly npm?: string;
    readonly api?: string;
    readonly models: Record<string, { readonly id: string; readonly name: string }>;
  }[];
  readonly default: Record<string, string>;
  readonly connected: readonly string[];
};

export type ProviderModelEntry = {
  readonly providerId: string;
  readonly modelId: string;
};

export type DiscoveryResult = {
  readonly connectedProviders: ReadonlySet<string>;
  readonly modelIndex: ReadonlyMap<string, ProviderModelEntry[]>;
  readonly providerModels: ReadonlyMap<string, ReadonlySet<string>>;
};

function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase();
}

export function buildDiscoveryIndex(response: ProviderListResponse): DiscoveryResult {
  const connectedProviders = new Set(
    response.connected.map((providerId) => normalizeIdentifier(providerId)),
  );
  const modelIndex = new Map<string, ProviderModelEntry[]>();
  const providerModels = new Map<string, ReadonlySet<string>>();

  for (const provider of response.all) {
    const providerId = normalizeIdentifier(provider.id);
    const modelsForProvider = new Set<string>();

    for (const modelId of Object.keys(provider.models ?? {})) {
      const normalizedModelId = normalizeIdentifier(modelId);
      if (!normalizedModelId) continue;

      modelsForProvider.add(normalizedModelId);

      const entries = modelIndex.get(normalizedModelId) ?? [];
      entries.push({ providerId, modelId: normalizedModelId });
      modelIndex.set(normalizedModelId, entries);
    }

    providerModels.set(providerId, modelsForProvider);
  }

  return {
    connectedProviders,
    modelIndex,
    providerModels,
  };
}

let cachedDiscovery: DiscoveryResult | undefined;
let discoveryPromise: Promise<void> | undefined;

export function initializeDiscovery(result: DiscoveryResult): void {
  cachedDiscovery = result;
}

export function getDiscovery(): DiscoveryResult | undefined {
  return cachedDiscovery;
}

/**
 * Store the in-flight discovery promise so callers (e.g. the config hook)
 * can await it without blocking bootstrap.
 */
export function setDiscoveryPromise(promise: Promise<void>): void {
  discoveryPromise = promise;
}

/**
 * Wait for the in-flight discovery to settle (resolve or reject).
 * Returns immediately if discovery already completed or was never started.
 */
export async function awaitDiscovery(): Promise<void> {
  if (discoveryPromise) {
    await discoveryPromise;
  }
}

export function resetDiscovery(): void {
  cachedDiscovery = undefined;
  discoveryPromise = undefined;
}
