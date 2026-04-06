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

### Phase 1: Provider-aware fallback chains [PENDING]
- Replace bare model strings in `fallback-chains.ts` with `FallbackEntry` objects: `{ providers: string[], model: string, variant?: string }`
- Update `category-config.ts` and `delegate-task/constants.ts` to use the same format
- Update agent plugin configs to reference the new fallback format
- Update `agent-builder.ts` to consume the new format

### Phase 2: Connected providers disk cache [PENDING]
- Add `src/shared/connected-providers-cache.ts` — sync reads, async writes, modeled on oh-my-openagent's implementation
- Write `connected-providers.json` and `provider-models.json` after discovery completes in bootstrap
- Read synchronously in config hook and resolution pipeline
- Add `hasCache()` for first-run detection

### Phase 3: New resolution pipeline [PENDING]
- Rewrite `provider-registry.ts` resolution to use the new pipeline:
  - Input: `FallbackEntry[]` + connected providers set (from disk cache or live discovery)
  - Iterate entries, find first whose `providers` intersects with connected set
  - Output: `"provider/model"` fully qualified string + optional variant
  - First run (no cache): return `undefined` — let OpenCode handle routing
- Remove `inferProviderFromModelName`, `MODEL_PROVIDER_HINTS`, `qualifyModel` inference path

### Phase 4: Config hook simplification [PENDING]
- Remove all inference heuristics from compositor (`inferProviderFromOpenCodeInput`, etc.)
- Config hook reads connected providers from disk cache (sync)
- If no cache (first run): skip model assignment entirely, let OpenCode use its defaults
- Remove async discovery await from config hook

### Phase 5: Task delegation alignment [PENDING]
- Category configs carry `FallbackEntry[]` instead of bare model strings
- Spawner and executor use new pipeline with connected providers
- Remove `awaitDiscovery()` calls — disk cache is synchronous
- First-run: skip model specification in prompt, let OpenCode handle routing

### Phase 6: Cleanup [PENDING]
- Remove dead code: `model-prefix-map.ts` zen platform mappings, `inferProviderFromModelName`, `MODEL_PROVIDER_HINTS`
- Add `provider-model-id-transform.ts` for provider-specific model name transforms (e.g., github-copilot dot notation)
- Update all tests to use new pipeline
- Remove `provider-discovery.ts` inline discovery (replaced by disk cache + live fallback)

## Key Design Principle

> **Never infer the provider from a model name.** Always use explicit provider lists + connected provider data. On first run, gracefully degrade by letting OpenCode handle model routing.
