import type { Hooks } from "@opencode-ai/plugin";
import type { AggregatedPlugins, PluginHookHandler } from "../types/plugin";
import { log } from "../shared/logger";
import { getDiscovery } from "../shared/provider-discovery";
import {
  getDefaultPreferredProvider,
  getProviderPriority,
  qualifyModel,
} from "../shared/provider-registry";
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

  let configCallCount = 0;
  const configHandlers = aggregated.hooks.get("config") ?? [];
  hooks.config = async (input) => {
    configCallCount++;
    const discoveryReady = !!getDiscovery();
    const inputRecord = input as Record<string, unknown>;
    log(`[compositor] config hook call #${configCallCount}`, {
      discoveryReady,
      inputKeys: Object.keys(input),
      mode: inputRecord["mode"],
    });

    if (!input.agent) {
      input.agent = {};
    }

    // Detect the provider to use for qualifying bare model names.
    // Priority: discovery data > config default_provider > "opencode" fallback.
    // Cannot await discovery here (deadlocks OpenCode's event loop), so we
    // use a synchronous fallback when discovery hasn't completed yet.
    const fallbackProvider = getDefaultPreferredProvider() ?? getProviderPriority()[0] ?? "opencode";

    for (const [name, agentConfig] of Object.entries(aggregated.agents)) {
      if (!input.agent[name]) {
        const { model: _bareModel, ...configWithoutModel } = agentConfig;
        input.agent[name] = {
          ...configWithoutModel,
          ...(agentConfig.tools ? { tools: { ...agentConfig.tools } } : {}),
        };
      }
    }

    // Set agent models from our config.
    // Primary path: use provider discovery to resolve bare model names.
    // Fallback: use the detected/configured provider prefix directly.
    for (const [name, agentDef] of Object.entries(aggregated.agents)) {
      const agentConfig = input.agent[name];
      if (!agentConfig) continue;
      const desiredModel = agentDef.model;
      if (!desiredModel) continue;
      const qualified = qualifyModel(desiredModel);
      if (qualified.includes("/")) {
        log(`[compositor] Agent "${name}": "${agentConfig.model ?? "(none)"}" → "${qualified}"`);
        agentConfig.model = qualified;
      } else {
        // Discovery not ready — use fallback provider
        const fallbackModel = `${fallbackProvider}/${desiredModel}`;
        log(
          `[compositor] Agent "${name}": "${agentConfig.model ?? "(none)"}" → "${fallbackModel}" (fallback provider: ${fallbackProvider})`,
        );
        agentConfig.model = fallbackModel;
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
