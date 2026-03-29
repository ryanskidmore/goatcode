// IMPORTANT: No bun:* imports — this file runs under Node.js via npx promptfoo eval

import {
  callLive,
  type OpenCodeProviderConfig,
  type ProviderResponse,
} from "./opencode-client.ts";

/**
 * Baseline provider for A/B comparison — simulates OpenCode WITHOUT GoatCode.
 *
 * promptfoo config example:
 *   providers:
 *     - id: file://eval/providers/opencode-baseline.ts
 *       config:
 *         model: "anthropic/claude-sonnet-4-20250514"
 */
export default class OpenCodeBaselineProvider {
  id() {
    return "goatcode-opencode-baseline";
  }

  async callApi(
    prompt: string,
    context?: { config?: { config?: { model?: string } } },
  ): Promise<ProviderResponse> {
    const startTime = Date.now();
    const model = context?.config?.config?.model ?? "anthropic/claude-sonnet-4-20250514";
    const cfg: OpenCodeProviderConfig = {
      enablePlugin: false,
      disabledHooks: ["*"],
      disabledTools: ["*"],
      model,
    };

    try {
      return await callLive(prompt, cfg, startTime);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);

      return {
        output: `[BASELINE] GoatCode plugin DISABLED. No hooks, no tools, no agents. Model: ${model}. Task: ${prompt}`,
        tokenUsage: { total: 0, prompt: 0, completion: 0 },
        cost: 0,
        metadata: {
          mock: true,
          baseline: true,
          error: errMsg,
          // NOTE: The OpenCode SDK does not support per-session plugin configuration.
          // enablePlugin: false is stored in metadata only. In a production setup,
          // this would require modifying opencode.json and restarting the server.
          pluginEnabled: false,
          disabledHooks: ["*"],
          disabledTools: ["*"],
          model,
          toolsUsed: [],
          hooksFired: [],
          sessionDuration: Date.now() - startTime,
        },
      };
    }
  }
}
