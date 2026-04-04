import type { Hooks } from "@opencode-ai/plugin";
import type { AggregatedPlugins, PluginHookHandler } from "../types/plugin";
import { log } from "../shared/logger";
import { getDiscovery } from "../shared/provider-discovery";
import {
  getDefaultPreferredProvider,
  getProviderPriority,
  qualifyModel,
} from "../shared/provider-registry";
import { toPlatformModel, type PlatformId } from "../shared/model-prefix-map";
import { HOOK_EVENT_NAMES } from "../types/hook";
import { getBuiltinSkillsDir } from "../features/skills";

/**
 * Detect the deployment platform from available signals.
 *
 * Priority:
 * 1. Provider discovery connected providers (most reliable when ready)
 * 2. Config input's default model prefix
 * 3. Config input's provider keys
 * 4. Config input's existing agent model prefixes
 *
 * Returns "zen" if any zen-prefixed provider/model is detected, "direct" otherwise.
 */
function detectPlatform(input: Record<string, unknown>): PlatformId {
  // 1. Check provider discovery (most reliable if available)
  const discovery = getDiscovery();
  if (discovery) {
    for (const providerId of discovery.connectedProviders) {
      if (providerId.startsWith("zen-")) return "zen";
    }
    // Discovery is ready and shows no zen providers → direct
    return "direct";
  }

  // 2. Check the config's default model
  const model = input["model"] as string | undefined;
  if (model && model.startsWith("zen-")) return "zen";

  // 3. Check provider configuration keys
  const provider = input["provider"] as Record<string, unknown> | undefined;
  if (provider) {
    for (const key of Object.keys(provider)) {
      if (key.startsWith("zen-")) return "zen";
    }
  }

  // 4. Check existing agent models (OpenCode may have pre-set these)
  const agents = input["agent"] as Record<string, { model?: string }> | undefined;
  if (agents) {
    for (const agent of Object.values(agents)) {
      if (agent?.model?.startsWith("zen-")) return "zen";
    }
  }

  return "direct";
}

function providerFromModel(model: unknown): string | undefined {
  if (typeof model !== "string") return undefined;
  const normalized = model.trim().toLowerCase();
  const separator = normalized.indexOf("/");
  if (separator <= 0) return undefined;
  return normalized.slice(0, separator);
}

function inferProviderFromOpenCodeAgentModels(
  inputAgents: Record<string, { model?: string } | undefined>,
): string | undefined {
  // Prefer OpenCode primary agents first when present.
  for (const agentName of [
    "build",
    "plan",
    "general",
    "explore",
    "title",
    "summary",
    "compaction",
  ]) {
    const provider = providerFromModel(inputAgents[agentName]?.model);
    if (provider) return provider;
  }

  // Fall back to any existing configured agent model.
  for (const agent of Object.values(inputAgents)) {
    const provider = providerFromModel(agent?.model);
    if (provider) return provider;
  }

  return undefined;
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
    const discoveredProvider = inferProviderFromOpenCodeAgentModels(input.agent);
    const fallbackProvider =
      getDefaultPreferredProvider() ?? discoveredProvider ?? getProviderPriority()[0] ?? "opencode";
    log("[compositor] model provider selection", {
      configuredDefault: getDefaultPreferredProvider(),
      discoveredFromAgents: discoveredProvider,
      selectedFallback: fallbackProvider,
    });

    for (const [name, agentConfig] of Object.entries(aggregated.agents)) {
      if (!input.agent[name]) {
        const { model: _bareModel, ...configWithoutModel } = agentConfig;
        input.agent[name] = {
          ...configWithoutModel,
          ...(agentConfig.tools ? { tools: { ...agentConfig.tools } } : {}),
        };
      }
    }

    // Detect platform so qualified canonical models (e.g. "anthropic/claude-opus-4-6")
    // are translated to the correct platform-specific form (e.g. "zen-anthropic/claude-opus-4-6").
    const platform = detectPlatform(inputRecord);
    if (platform !== "direct") {
      log(`[compositor] Detected platform: ${platform}`);
    }

    // Set agent models from our config.
    // Primary path: use provider discovery to resolve bare model names.
    // Fallback: use the detected/configured provider prefix directly.
    // Finally, apply platform mapping so models use the correct provider prefix
    // (e.g. on zen: "anthropic/X" → "zen-anthropic/X").
    for (const [name, agentDef] of Object.entries(aggregated.agents)) {
      const agentConfig = input.agent[name];
      if (!agentConfig) continue;
      const desiredModel = agentDef.model;
      if (!desiredModel) continue;
      const qualified = qualifyModel(desiredModel, fallbackProvider);
      if (qualified.includes("/")) {
        const platformModel = toPlatformModel(qualified, platform);
        log(
          `[compositor] Agent "${name}": "${agentConfig.model ?? "(none)"}" → "${platformModel}"${platformModel !== qualified ? ` (canonical: ${qualified})` : ""}`,
        );
        agentConfig.model = platformModel;
      } else {
        // Discovery not ready — use fallback provider
        const fallbackModel = toPlatformModel(`${fallbackProvider}/${desiredModel}`, platform);
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
