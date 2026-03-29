// IMPORTANT: No bun:* imports — this file runs under Node.js via npx promptfoo eval

import {
  callLive,
  type OpenCodeProviderConfig,
  type ProviderResponse,
} from "./opencode-client.ts";

const DEFAULT_CONFIG: OpenCodeProviderConfig = {
  enablePlugin: true,
  disabledHooks: [],
  disabledTools: [],
  model: "anthropic/claude-sonnet-4-20250514",
};

/**
 * promptfoo custom provider — uses @opencode-ai/sdk to spawn a real session.
 * Falls back to a structured mock response if the server isn't running.
 *
 * promptfoo config example:
 *   providers:
 *     - id: file://eval/providers/opencode-provider.ts
 *       config:
 *         enablePlugin: true
 *         disabledHooks: []
 *         disabledTools: []
 *         model: "anthropic/claude-sonnet-4-20250514"
 */
export default class OpenCodeProvider {
  id() {
    return "goatcode-opencode-provider";
  }

  async callApi(
    prompt: string,
    context?: { config?: { config?: Partial<OpenCodeProviderConfig> } },
  ): Promise<ProviderResponse> {
    const cfg: OpenCodeProviderConfig = {
      ...DEFAULT_CONFIG,
      ...(context?.config?.config ?? {}),
    };

    const startTime = Date.now();

    try {
      return await callLive(prompt, cfg, startTime);
    } catch (err) {
      const label = cfg.enablePlugin ? "ENABLED" : "DISABLED";
      const errMsg = err instanceof Error ? err.message : String(err);
      return {
        output: `[MOCK] No OpenCode server available. GoatCode plugin would be: ${label}. Task: ${prompt}`,
        tokenUsage: { total: 0, prompt: 0, completion: 0 },
        cost: 0,
        metadata: {
          mock: true,
          error: errMsg,
          pluginEnabled: cfg.enablePlugin,
          disabledHooks: cfg.disabledHooks,
          disabledTools: cfg.disabledTools,
          model: cfg.model,
          sessionDuration: Date.now() - startTime,
        },
      };
    }
  }
}
