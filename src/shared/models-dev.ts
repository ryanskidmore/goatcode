import { log } from "./logger";

const MODELS_DEV_URL = "https://models.dev/api.json";
const FIVE_MINUTES_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;

const NPM_TO_PROVIDER_ID: Record<string, string> = {
  "@ai-sdk/anthropic": "anthropic",
  "@ai-sdk/openai": "openai",
  "@ai-sdk/google": "google",
  "@ai-sdk/mistral": "mistral",
  "@ai-sdk/cohere": "cohere",
  "@ai-sdk/groq": "groq",
  "@ai-sdk/amazon-bedrock": "amazon-bedrock",
  "@ai-sdk/azure": "azure",
  "@ai-sdk/deepseek": "deepseek",
  "@ai-sdk/xai": "xai",
};

export type ModelsDevModel = {
  id: string;
  name: string;
  family?: string;
  provider?: { npm: string };
  [key: string]: unknown;
};

export type ModelsDevProvider = {
  id: string;
  name: string;
  npm?: string;
  models: Record<string, ModelsDevModel>;
  [key: string]: unknown;
};

export type ModelsDevIndex = {
  byPlatformModel: Map<string, string>;
  byCanonical: Map<string, Set<string>>;
  providers: Map<string, ModelsDevProvider>;
};

export type ModelsDevCache = {
  get: () => Promise<ModelsDevIndex>;
  clear: () => void;
};

function emptyIndex(): ModelsDevIndex {
  return {
    byPlatformModel: new Map<string, string>(),
    byCanonical: new Map<string, Set<string>>(),
    providers: new Map<string, ModelsDevProvider>(),
  };
}

function toCanonicalModelId(
  provider: ModelsDevProvider,
  model: ModelsDevModel,
  modelId: string,
): string | undefined {
  const modelProvider = model.provider?.npm;
  if (modelProvider) {
    const canonicalProvider = NPM_TO_PROVIDER_ID[modelProvider];
    if (canonicalProvider) return `${canonicalProvider}/${modelId}`;
    // fall through to other strategies if npm package is unrecognised
  }

  if (provider.npm) {
    const canonicalProvider = NPM_TO_PROVIDER_ID[provider.npm];
    if (canonicalProvider) return `${canonicalProvider}/${modelId}`;
  }

  if (modelId.includes("/")) return modelId;

  return undefined;
}

export function buildModelsDevIndex(data: Record<string, ModelsDevProvider>): ModelsDevIndex {
  const index = emptyIndex();

  for (const [providerKey, provider] of Object.entries(data)) {
    const platformId = provider.id || providerKey;
    index.providers.set(platformId, provider);

    for (const [modelKey, model] of Object.entries(provider.models ?? {})) {
      const modelId = model.id || modelKey;
      const canonicalModelId = toCanonicalModelId(provider, model, modelId);
      if (!canonicalModelId) continue;

      const platformModelId = `${platformId}/${modelId}`;
      index.byPlatformModel.set(platformModelId, canonicalModelId);

      const mapped = index.byCanonical.get(canonicalModelId);
      if (mapped) {
        mapped.add(platformModelId);
      } else {
        index.byCanonical.set(canonicalModelId, new Set<string>([platformModelId]));
      }
    }
  }

  return index;
}

export async function fetchModelsDevData(): Promise<ModelsDevIndex> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(MODELS_DEV_URL, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`models.dev request failed with status ${response.status}`);
    }

    const parsed = (await response.json()) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("models.dev response is not a provider map");
    }

    return buildModelsDevIndex(parsed as Record<string, ModelsDevProvider>);
  } catch (error) {
    log("failed to fetch models.dev data", error);
    return emptyIndex();
  } finally {
    clearTimeout(timeoutId);
  }
}

export function resolveWithModelsDevData(
  platformModelId: string,
  index: ModelsDevIndex,
): string | undefined {
  const separatorIndex = platformModelId.indexOf("/");
  if (separatorIndex <= 0) return undefined;

  const platformId = platformModelId.slice(0, separatorIndex);
  const modelId = platformModelId.slice(separatorIndex + 1);
  if (!modelId) return undefined;

  return index.byPlatformModel.get(`${platformId}/${modelId}`);
}

export function createModelsDevCache(
  ttlMs: number = FIVE_MINUTES_MS,
  fetchFn: () => Promise<ModelsDevIndex> = fetchModelsDevData,
): ModelsDevCache {
  let cached: ModelsDevIndex | undefined;
  let expiresAt = 0;
  let inflight: Promise<ModelsDevIndex> | undefined;
  let generation = 0;

  return {
    async get(): Promise<ModelsDevIndex> {
      const now = Date.now();
      if (cached && now < expiresAt) return cached;
      if (inflight) return inflight;

      const capturedGeneration = generation;
      inflight = fetchFn();
      try {
        const result = await inflight;
        if (generation === capturedGeneration && result.byPlatformModel.size > 0) {
          cached = result;
          expiresAt = Date.now() + ttlMs;
        }
        return result;
      } finally {
        inflight = undefined;
      }
    },
    clear(): void {
      cached = undefined;
      expiresAt = 0;
      inflight = undefined;
      generation++;
    },
  };
}
