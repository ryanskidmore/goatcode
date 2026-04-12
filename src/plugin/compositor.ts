import type { Hooks } from "@opencode-ai/plugin";
import type { AggregatedPlugins, PluginHookHandler } from "../types/plugin";
import { log } from "../shared/logger";
import { readConnectedProviders } from "../shared/connected-providers-cache";
import { resolveModel } from "../shared/model-resolution-pipeline";
import { getFallbackChain, mergeFallbackChains } from "../agents/fallback-chains";
import { HOOK_EVENT_NAMES } from "../types/hook";
import { getBuiltinSkillsDir } from "../features/skills";
import type { GoatCodeConfig } from "../types/config";

const FUNCTION_HOOK_SLOTS = HOOK_EVENT_NAMES.filter(
  (name): name is Exclude<(typeof HOOK_EVENT_NAMES)[number], "tool"> => name !== "tool",
) as readonly Exclude<(typeof HOOK_EVENT_NAMES)[number], "tool">[];

function buildSlotHandler(handlers: PluginHookHandler[]): PluginHookHandler {
  if (handlers.length === 0) {
    return async () => {};
  }
  return async (input: unknown, output: unknown) => {
    for (const handler of handlers) {
      try {
        await handler(input, output);
      } catch (err) {
        log(`[compositor] Handler error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  };
}

/**
 * Compose aggregated plugin contributions into a complete OpenCode Hooks instance.
 * Produces all handler slots (1 tool record + function hooks).
 * The `config` slot injects agents before delegating to registered hooks.
 * Slots without registered handlers are defined as no-ops.
 */
export function compose(
  aggregated: AggregatedPlugins,
  agentOverrides?: GoatCodeConfig["agents"],
): Hooks {
  const hooks: Hooks = {};

  // Shallow-copy the tools record. structuredClone cannot clone the execute
  // functions inside each ToolDefinition and would throw at runtime.
  hooks.tool = { ...aggregated.tools };

  let configCallCount = 0;
  const configHandlers = aggregated.hooks.get("config") ?? [];
  hooks.config = async (input) => {
    configCallCount++;
    const inputRecord = input as Record<string, unknown>;

    // Read connected providers from disk cache (synchronous).
    // On first run this is null — we skip model assignment and let
    // OpenCode handle routing with its system defaults.
    const connected = readConnectedProviders();
    log(`[compositor] config hook call #${configCallCount}`, {
      connectedProviders: connected,
      inputKeys: Object.keys(input),
      mode: inputRecord["mode"],
    });

    if (!input.agent) {
      input.agent = {};
    }

    // Register agent entries (without model — model is set below).
    for (const [name, agentConfig] of Object.entries(aggregated.agents)) {
      if (!input.agent[name]) {
        const { model: _bareModel, ...configWithoutModel } = agentConfig;
        input.agent[name] = {
          ...configWithoutModel,
          ...(agentConfig.tools ? { tools: { ...agentConfig.tools } } : {}),
        };
      }
    }

    // Resolve agent models using the new provider-aware pipeline.
    // Each agent has a fallback chain that names which providers serve
    // each model. We pick the first entry whose provider is connected.
    if (connected !== null) {
      for (const [name] of Object.entries(aggregated.agents)) {
        const agentConfig = input.agent[name];
        if (!agentConfig) continue;

        const overrideConfig = agentOverrides?.[name as keyof typeof agentOverrides];
        const chain = mergeFallbackChains({
          defaults: getFallbackChain(name),
          overrides: overrideConfig?.fallback_models,
          mode: overrideConfig?.fallback_mode,
        });
        const resolved = resolveModel({
          fallbackChain: chain,
          connectedProviders: connected,
        });

        if (resolved) {
          log(
            `[compositor] Agent "${name}": "${agentConfig.model ?? "(none)"}" → "${resolved.model}"${resolved.variant ? ` (variant: ${resolved.variant})` : ""}`,
          );
          agentConfig.model = resolved.model;
          if (resolved.variant) {
            agentConfig["variant"] = resolved.variant;
          }
        } else {
          log(
            `[compositor] Agent "${name}": no connected provider matched fallback chain, keeping "${agentConfig.model ?? "(none)"}"`,
          );
        }
      }
    } else {
      log(
        "[compositor] No connected providers cache (first run), skipping model assignment — OpenCode will use system defaults",
      );
    }

    if (input.agent.build === undefined) {
      input.agent.build = { disable: true };
    }
    if (input.agent.plan === undefined) {
      input.agent.plan = { disable: true };
    }

    const configRecord = input as Record<string, unknown>;
    if (!configRecord["default_agent"]) {
      configRecord["default_agent"] = "orchestrator";
    }

    const skills = (configRecord["skills"] ?? {}) as Record<string, unknown>;
    const existingPaths = (skills["paths"] ?? []) as string[];
    const builtinDir = getBuiltinSkillsDir();
    if (builtinDir && !existingPaths.includes(builtinDir)) {
      skills["paths"] = [...existingPaths, builtinDir];
      configRecord["skills"] = skills;
    }

    for (const handler of configHandlers) {
      await handler(input);
    }
  };

  for (const key of FUNCTION_HOOK_SLOTS) {
    if (key === "config") continue;
    const handlers = aggregated.hooks.get(key) ?? [];
    (hooks as Record<typeof key, PluginHookHandler>)[key] = buildSlotHandler(handlers);
  }

  const toolCount = Object.keys(aggregated.tools).length;
  const agentCount = Object.keys(aggregated.agents).length;
  log(
    `[compositor] Composed plugin: ${toolCount} tools, ${agentCount} agents, ${HOOK_EVENT_NAMES.length} handler slots`,
  );

  return hooks;
}
