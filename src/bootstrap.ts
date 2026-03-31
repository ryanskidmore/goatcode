import type { Hooks } from "@opencode-ai/plugin";
import { loadConfig } from "./config/loader";
import { validateConfig } from "./config/validator";
import { PluginRegistry } from "./registry/plugin-registry";
import { compose } from "./plugin/compositor";
import { log } from "./shared/logger";
import type { OpenCodeContext } from "./types/plugin";
import type { GoatCodeConfig } from "./types/config";
import type { PluginDefinition } from "./types/plugin";
import { BUILTIN_AGENT_PLUGINS } from "./agents/builtin-agents";
import { BUILTIN_HOOK_PLUGINS } from "./hooks/builtin-hooks";
import { BUILTIN_TOOL_PLUGINS } from "./tools/builtin-tools";
import { BUILTIN_FEATURE_PLUGINS } from "./features/builtin-features";
import { registerProjectSkillLoader } from "./features/skills";
import {
  buildDiscoveryIndex,
  initializeDiscovery,
  resetDiscovery,
  type ProviderListResponse,
} from "./shared/provider-discovery";
import {
  resetProviderRegistry,
  setDefaultPreferredProvider,
  setProviderPriority,
} from "./shared/provider-registry";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isValidPluginDefinition(value: unknown): value is PluginDefinition {
  if (!isRecord(value)) return false;
  const obj = value;

  // Required: non-empty name string
  if (typeof obj["name"] !== "string" || obj["name"] === "") return false;

  // Optional: dependencies must be array of strings if present
  if (obj["dependencies"] !== undefined) {
    if (!isStringArray(obj["dependencies"])) return false;
  }

  // Optional: hooks/tools/agents must be plain objects if present
  for (const key of ["hooks", "tools", "agents"] as const) {
    if (obj[key] !== undefined) {
      if (typeof obj[key] !== "object" || obj[key] === null || Array.isArray(obj[key]))
        return false;
    }
  }

  if (obj["hooks"] !== undefined) {
    for (const handler of Object.values(obj["hooks"] as Record<string, unknown>)) {
      if (handler !== undefined && typeof handler !== "function") return false;
    }
  }

  // Optional: setup/teardown must be functions if present
  if (obj["setup"] !== undefined && typeof obj["setup"] !== "function") return false;
  if (obj["teardown"] !== undefined && typeof obj["teardown"] !== "function") return false;

  return true;
}

export async function bootstrap(ctx: OpenCodeContext): Promise<Hooks> {
  const rawConfig = await loadConfig(ctx.directory);

  const validation = validateConfig(rawConfig ?? {});
  let config: GoatCodeConfig;
  if (validation.success) {
    config = validation.config;
  } else {
    log("[bootstrap] Config validation failed, using defaults", {
      errors: validation.errors,
    });
    process.stderr.write(
      `[goatcode] WARNING: goatcode.config.ts has validation errors — using defaults.\n` +
        validation.errors.map((e) => `  - ${e}`).join("\n") +
        "\n",
    );
    const fallback = validateConfig({});
    if (!fallback.success) {
      throw new Error("[bootstrap] Default config validation failed");
    }
    config = fallback.config;
  }

  resetProviderRegistry();
  resetDiscovery();
  setProviderPriority(config.provider_priority ?? []);
  setDefaultPreferredProvider(config.default_provider);
  // Fire provider discovery in the background — don't block plugin init.
  // The compositor's config hook runs on every session/message, so models
  // will be qualified once discovery completes (typically within seconds).
  if (ctx.client?.provider?.list) {
    const DISCOVERY_TIMEOUT_MS = 15_000;
    void Promise.race([
      ctx.client.provider.list(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`provider.list timeout after ${DISCOVERY_TIMEOUT_MS}ms`)),
          DISCOVERY_TIMEOUT_MS,
        ),
      ),
    ])
      .then((providerResponse) => {
        const providerData = (
          providerResponse as Awaited<ReturnType<typeof ctx.client.provider.list>>
        )?.data as ProviderListResponse | undefined;
        if (providerData?.all && providerData?.connected) {
          const discovery = buildDiscoveryIndex(providerData);
          initializeDiscovery(discovery);
          log("[bootstrap] Provider discovery completed");
        } else {
          log("[bootstrap] Provider discovery response missing required fields");
        }
      })
      .catch((error: unknown) => {
        log("[bootstrap] Provider discovery failed; using pass-through model resolution", {
          error,
        });
      });
  } else {
    log("[bootstrap] client.provider.list not available; skipping provider discovery");
  }

  const registry = new PluginRegistry();

  for (const plugin of BUILTIN_AGENT_PLUGINS) {
    registry.register(plugin);
  }

  for (const plugin of BUILTIN_HOOK_PLUGINS) {
    registry.register(plugin);
  }

  for (const plugin of BUILTIN_TOOL_PLUGINS) {
    registry.register(plugin);
  }

  for (const plugin of BUILTIN_FEATURE_PLUGINS) {
    registry.register(plugin);
  }

  for (const packageName of config.plugins ?? []) {
    try {
      const mod = await import(packageName);
      const pluginDef = mod.default ?? mod;
      if (!isValidPluginDefinition(pluginDef)) {
        log(
          `[bootstrap] External plugin "${packageName}" does not export a valid PluginDefinition, skipping`,
        );
        process.stderr.write(
          `[goatcode] WARNING: Plugin "${packageName}" is not a valid PluginDefinition and was skipped.\n`,
        );
        continue;
      }
      registry.register(pluginDef);
    } catch (error) {
      log(`[bootstrap] Failed to load external plugin: ${packageName}`, { error });
      const msg = error instanceof Error ? error.message : String(error);
      process.stderr.write(`[goatcode] WARNING: Failed to load plugin "${packageName}": ${msg}\n`);
    }
  }

  registerProjectSkillLoader(ctx.directory);

  const resolved = registry.resolve();
  const initializedPlugins = await registry.setup(resolved, ctx);

  const aggregated = registry.aggregate(initializedPlugins, {
    disabledAgents: config.disabled_agents,
    disabledHooks: config.disabled_hooks,
    disabledTools: config.disabled_tools,
  });
  return compose(aggregated);
}
