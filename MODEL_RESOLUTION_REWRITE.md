# Model Resolution Rewrite Plan

## Problem

The current model resolution system is fundamentally broken. It tries to **infer** the routing provider from model name prefixes (e.g., `"claude-*"` -> `"anthropic"`, `"gpt-*"` -> `"openai"`), but this conflates the model's **origin** (who made it) with its **routing provider** (how to access it). When a user only has `"opencode"` connected as a gateway provider, all models should route through `"opencode"` regardless of whether the model is Claude, GPT, or Gemini.

Additionally, provider discovery is async and races with the config hook, causing the system to fall back to hardcoded heuristics that pick the wrong provider.

## Reference Architecture (oh-my-openagent)

oh-my-openagent solves this correctly with three key design decisions:

1. **Fallback chains embed explicit provider lists per model** — each entry names which providers can serve that model
2. **Connected providers are disk-cached** — written async after `provider.list()`, read synchronously in the config hook
3. **Resolution pipeline checks connected providers** — iterates entries, picks the first entry whose providers intersect with connected set. No inference from model names.

## Phases

### Phase 1: Provider-aware fallback chains [DONE]
- Replaced bare model strings in `fallback-chains.ts` with `FallbackEntry` objects: `{ providers: string[], model: string, variant?: string }`
- Added `CATEGORY_FALLBACK_CHAINS` for task delegation categories
- Updated `delegate-task/constants.ts` and `types.ts` to carry `fallback_chain`

### Phase 2: Connected providers disk cache [DONE]
- Added `src/shared/connected-providers-cache.ts` — sync reads, async writes
- Writes `connected-providers.json` and `provider-models.json` to `~/.cache/goatcode-sh/`
- Bootstrap calls `updateFromProviderList()` after discovery completes
- 14 tests covering read/write/first-run behavior

### Phase 3: New resolution pipeline [DONE]
- Rewrote `model-resolution-pipeline.ts`:
  - `resolveModel()` takes `FallbackEntry[]` + connected providers, picks first connected match
  - `resolveQualifiedModel()` for runtime fallback hooks (already-qualified strings)
  - First run (no cache): returns `undefined` — let OpenCode handle routing
- Updated runtime hooks (model-fallback, runtime-fallback, foreground-fallback) to use `resolveQualifiedModel`
- 25 tests covering all resolution paths

### Phase 4: Config hook simplification [DONE]
- Removed all inference heuristics from compositor:
  - No more `inferProviderFromOpenCodeInput`
  - No more `inferProviderFromModelName` / `MODEL_PROVIDER_HINTS` in config path
  - No more `qualifyModel` in config hook
  - No more `detectPlatform` / `toPlatformModel`
- Config hook reads connected providers from disk cache (sync)
- On first run (no cache): skips model assignment, OpenCode uses system defaults

### Phase 5: Task delegation alignment [DONE]
- Category configs carry `fallback_chain` from `CATEGORY_FALLBACK_CHAINS`
- Spawner uses `resolveModel()` with fallback chain from `LaunchInput`
- Sync executor uses same pipeline
- No more `awaitDiscovery()` calls — disk cache is synchronous

### Phase 6: Cleanup [DONE]
- Removed from `provider-registry.ts`: `inferProviderFromModelName`, `MODEL_PROVIDER_HINTS`, `qualifyModel`, `resolveProvider`, `findProvidersForModel`, `setProviderPriority`, `getProviderPriority`, `setDefaultPreferredProvider`, `registerProviderModelMap`, `unregisterProviderModelMap`, `resetProviderRegistry`. Only `isQualifiedModel()` remains.
- Removed from `provider-discovery.ts`: `awaitDiscovery`, `setDiscoveryPromise`
- Removed from `model-normalization.ts`: `normalizeAndQualifyModel` (depended on `qualifyModel`)
- Removed from `agent-builder.ts`: `qualifyModel` call (compositor handles model resolution now)
- Removed from `bootstrap.ts`: `resetProviderRegistry()`, `setProviderPriority()`, `setDefaultPreferredProvider()` calls
- Deleted `provider-registry.test.ts` (tested removed functions)
- `model-prefix-map.ts` retained but no longer in the live config hook path; only its test imports it directly

## Key Design Principle

> **Never infer the provider from a model name.** Always use explicit provider lists + connected provider data. On first run, gracefully degrade by letting OpenCode handle model routing.

## Test Results

- 888 tests pass (0 failures in GoatCode source)
- 24 tests removed (tested deleted inference functions)
- TypeScript: 0 errors
- Lint: 0 warnings

## Deleted Code

526 lines removed in Phase 6 alone. Total removed inference functions:
- `inferProviderFromModelName` + `MODEL_PROVIDER_HINTS` (model name → provider heuristics)
- `qualifyModel` + `resolveProvider` (old resolution pipeline)
- `findProvidersForModel` (discovery-based lookup used by old pipeline)
- `setProviderPriority` / `getProviderPriority` (sorting config no longer used for routing)
- `setDefaultPreferredProvider` / `getDefaultPreferredProvider` (old config hook fallback)
- `normalizeAndQualifyModel` (wrapper around removed qualifyModel)
- `awaitDiscovery` / `setDiscoveryPromise` (async discovery wait — replaced by disk cache)
