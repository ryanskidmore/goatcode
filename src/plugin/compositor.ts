import type { Hooks } from "@opencode-ai/plugin";
import type { AggregatedPlugins, PluginHookHandler } from "../types/plugin";
import { log } from "../shared/logger";
import { qualifyModel } from "../shared/provider-registry";
import { HOOK_EVENT_NAMES } from "../types/hook";
import { getBuiltinSkillsDir } from "../features/skills";

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

    // Qualify bare model names using async provider discovery data.
    // Discovery completes ~150ms after bootstrap; the config hook runs
    // on every session/message, so models get qualified on the first
    // call after discovery finishes. Before that, bare names pass through
    // unchanged for OpenCode to handle.
    for (const agentConfig of Object.values(input.agent)) {
      if (agentConfig?.model && !agentConfig.model.includes("/")) {
        const qualified = qualifyModel(agentConfig.model);
        if (qualified.includes("/")) {
          agentConfig.model = qualified;
        }
      }
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
