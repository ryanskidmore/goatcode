import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { log } from "./logger";
import { getGoatCodeCacheDir } from "./data-path";

const CONNECTED_PROVIDERS_FILE = "connected-providers.json";
const PROVIDER_MODELS_FILE = "provider-models.json";

interface ConnectedProvidersData {
  connected: string[];
  updatedAt: string;
}

interface ProviderModelsData {
  models: Record<string, string[]>;
  connected: string[];
  updatedAt: string;
}

/** In-memory cache to avoid repeated disk reads within the same process. */
let memConnected: string[] | null | undefined;
let memProviderModels: ProviderModelsData | null | undefined;

function getCacheFilePath(filename: string): string {
  return join(getGoatCodeCacheDir(), filename);
}

function ensureCacheDir(): void {
  const dir = getGoatCodeCacheDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// ---------------------------------------------------------------------------
// Connected providers
// ---------------------------------------------------------------------------

/**
 * Read connected provider IDs from disk cache (synchronous).
 * Returns `null` on first run when no cache file exists.
 */
export function readConnectedProviders(): string[] | null {
  if (memConnected !== undefined) return memConnected;

  const filePath = getCacheFilePath(CONNECTED_PROVIDERS_FILE);
  if (!existsSync(filePath)) {
    log("[connected-providers-cache] No cache file, first run");
    memConnected = null;
    return null;
  }

  try {
    const raw = readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw) as ConnectedProvidersData;
    log("[connected-providers-cache] Read cache", {
      count: data.connected.length,
      providers: data.connected,
    });
    memConnected = data.connected;
    return data.connected;
  } catch (err) {
    log("[connected-providers-cache] Error reading cache", { error: String(err) });
    memConnected = null;
    return null;
  }
}

/** Write connected providers to disk (and update in-memory cache). */
export function writeConnectedProviders(connected: string[]): void {
  ensureCacheDir();
  const filePath = getCacheFilePath(CONNECTED_PROVIDERS_FILE);
  const data: ConnectedProvidersData = {
    connected,
    updatedAt: new Date().toISOString(),
  };
  try {
    writeFileSync(filePath, JSON.stringify(data, null, 2));
    memConnected = connected;
    log("[connected-providers-cache] Written", { count: connected.length });
  } catch (err) {
    log("[connected-providers-cache] Error writing", { error: String(err) });
  }
}

/** Whether a cache file exists on disk. */
export function hasConnectedProvidersCache(): boolean {
  return existsSync(getCacheFilePath(CONNECTED_PROVIDERS_FILE));
}

// ---------------------------------------------------------------------------
// Provider models
// ---------------------------------------------------------------------------

/**
 * Read the per-provider model lists from disk cache (synchronous).
 * Returns `null` on first run.
 */
export function readProviderModels(): ProviderModelsData | null {
  if (memProviderModels !== undefined) return memProviderModels;

  const filePath = getCacheFilePath(PROVIDER_MODELS_FILE);
  if (!existsSync(filePath)) {
    memProviderModels = null;
    return null;
  }

  try {
    const raw = readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw) as ProviderModelsData;
    log("[connected-providers-cache] Read provider-models cache", {
      providerCount: Object.keys(data.models).length,
    });
    memProviderModels = data;
    return data;
  } catch (err) {
    log("[connected-providers-cache] Error reading provider-models", { error: String(err) });
    memProviderModels = null;
    return null;
  }
}

/** Write per-provider model lists to disk. */
export function writeProviderModels(data: {
  models: Record<string, string[]>;
  connected: string[];
}): void {
  ensureCacheDir();
  const filePath = getCacheFilePath(PROVIDER_MODELS_FILE);
  const cacheData: ProviderModelsData = {
    ...data,
    updatedAt: new Date().toISOString(),
  };
  try {
    writeFileSync(filePath, JSON.stringify(cacheData, null, 2));
    memProviderModels = cacheData;
    log("[connected-providers-cache] Written provider-models", {
      providerCount: Object.keys(data.models).length,
    });
  } catch (err) {
    log("[connected-providers-cache] Error writing provider-models", { error: String(err) });
  }
}

// ---------------------------------------------------------------------------
// Async updater — called from bootstrap after provider.list() resolves
// ---------------------------------------------------------------------------

export async function updateFromProviderList(client: {
  provider?: {
    list?: () => Promise<{
      data?: {
        connected?: string[];
        all?: Array<{ id: string; models?: Record<string, unknown> }>;
      };
    }>;
  };
}): Promise<void> {
  if (!client?.provider?.list) {
    log("[connected-providers-cache] client.provider.list not available");
    return;
  }

  try {
    const result = await client.provider.list();
    const connected = result.data?.connected ?? [];
    log("[connected-providers-cache] Fetched providers", {
      count: connected.length,
      providers: connected,
    });

    writeConnectedProviders(connected);

    const modelsByProvider: Record<string, string[]> = {};
    for (const provider of result.data?.all ?? []) {
      if (provider.models) {
        const modelIds = Object.keys(provider.models);
        if (modelIds.length > 0) {
          modelsByProvider[provider.id] = modelIds;
        }
      }
    }

    writeProviderModels({ models: modelsByProvider, connected });
  } catch (err) {
    log("[connected-providers-cache] Error updating from provider list", { error: String(err) });
  }
}

/** Reset in-memory caches (for testing). */
export function resetConnectedProvidersCache(): void {
  memConnected = undefined;
  memProviderModels = undefined;
}
