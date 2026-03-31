import type { Hooks } from "@opencode-ai/plugin";
import type { AggregatedPlugins, PluginHookHandler } from "../types/plugin";
import { log } from "../shared/logger";
import { HOOK_EVENT_NAMES } from "../types/hook";
import { getBuiltinSkillsDir } from "../features/skills";

type ProviderMap = Record<string, { models?: Record<string, unknown> }>;

/**
 * Resolve a bare model name (e.g. "gpt-5.4") to a qualified provider/model
 * string using the provider map from OpenCode's config hook input.
 * Returns the qualified string or the original bare name if unresolvable.
 */
function qualifyModelFromProviders(bareModel: string, providers: ProviderMap): string {
  const normalized = bareModel.trim().toLowerCase();
  for (const [providerId, providerConfig] of Object.entries(providers)) {
    const models = providerConfig?.models;
    if (!models) continue;
    for (const modelId of Object.keys(models)) {
      if (modelId.toLowerCase() === normalized) {
        return `${providerId}/${modelId}`;
      }
    }
  }
  return bareModel;
}

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
export function compose(aggregated: AggregatedPlugins): Hooks {
  const hooks: Hooks = {};

  // Shallow-copy the tools record. structuredClone cannot clone the execute
  // functions inside each ToolDefinition and would throw at runtime.
  hooks.tool = { ...aggregated.tools };

  const configHandlers = aggregated.hooks.get("config") ?? [];
  hooks.config = async (input) => {
    if (!input.agent) {
      input.agent = {};
    }

    for (const [name, agentConfig] of Object.entries(aggregated.agents)) {
      if (!input.agent[name]) {
        input.agent[name] = {
          ...agentConfig,
          ...(agentConfig.tools ? { tools: { ...agentConfig.tools } } : {}),
        };
      }
    }

    // Resolve bare model names using the provider map from OpenCode's config.
    // input.provider is { [providerId]: { models?: { [modelId]: ... } } }.
    const providers = (input as Record<string, unknown>).provider as ProviderMap | undefined;
    if (providers) {
      log("[compositor] Provider map keys", { keys: Object.keys(providers) });
      for (const agentConfig of Object.values(input.agent)) {
        if (agentConfig?.model && !agentConfig.model.includes("/")) {
          const before = agentConfig.model;
          agentConfig.model = qualifyModelFromProviders(agentConfig.model, providers);
          log("[compositor] Model qualification", { before, after: agentConfig.model });
        }
      }
    } else {
      log("[compositor] No provider map in config hook input");
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
