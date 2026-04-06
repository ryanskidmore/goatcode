export { log, getLogFilePath } from "./logger";
export { deepMerge, isPlainObject } from "./deep-merge";
export { toSnakeCase } from "./snake-case";
export { truncateDescription } from "./truncate-description";
export { getDataDir, getCacheDir, getOpenCodeStorageDir, getGoatCodeCacheDir } from "./data-path";
export {
  readConnectedProviders,
  writeConnectedProviders,
  hasConnectedProvidersCache,
  readProviderModels,
  writeProviderModels,
  updateFromProviderList,
  resetConnectedProvidersCache,
} from "./connected-providers-cache";
export { safeCreateHook } from "./safe-create-hook";
export { normalizeModel, parseModelId, normalizeAndQualifyModel } from "./model-normalization";
export { isModelAvailable } from "./model-availability";
export { buildFallbackChain } from "./fallback-chain";
export { resolveModel } from "./model-resolution-pipeline";
export type {
  ModelResolutionInput,
  ModelResolutionSource,
  ModelResolutionResult,
} from "./model-resolution-pipeline";
export {
  toPlatformModel,
  toCanonicalModel,
  registerPlatformMappings,
  getKnownPlatforms,
} from "./model-prefix-map";
export type { PlatformId, BuiltinPlatformId } from "./model-prefix-map";
export {
  resolveProvider,
  qualifyModel,
  isQualifiedModel,
  findProvidersForModel,
  setProviderPriority,
  getProviderPriority,
  setDefaultPreferredProvider,
  getDefaultPreferredProvider,
  registerProviderModelMap,
  unregisterProviderModelMap,
  resetProviderRegistry,
} from "./provider-registry";
export type { ProviderResolutionResult } from "./provider-registry";
export {
  buildDiscoveryIndex,
  initializeDiscovery,
  getDiscovery,
  resetDiscovery,
} from "./provider-discovery";
export type {
  ProviderListResponse,
  ProviderModelEntry,
  DiscoveryResult,
} from "./provider-discovery";
export {
  buildModelsDevIndex,
  fetchModelsDevData,
  resolveWithModelsDevData,
  createModelsDevCache,
} from "./models-dev";
export type {
  ModelsDevModel,
  ModelsDevProvider,
  ModelsDevIndex,
  ModelsDevCache,
} from "./models-dev";
