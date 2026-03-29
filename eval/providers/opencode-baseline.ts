// IMPORTANT: No bun:* imports — this file runs under Node.js via npx promptfoo eval

interface ProviderResponse {
  output: string;
  tokenUsage: { total: number; prompt: number; completion: number };
  cost: number;
  metadata: Record<string, unknown>;
}

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
    const model = context?.config?.config?.model ?? "anthropic/claude-sonnet-4-20250514";

    return {
      output: `[BASELINE] GoatCode plugin DISABLED. No hooks, no tools, no agents. Model: ${model}. Task: ${prompt}`,
      tokenUsage: { total: 0, prompt: 0, completion: 0 },
      cost: 0,
      metadata: {
        mock: true,
        baseline: true,
        pluginEnabled: false,
        disabledHooks: ["*"],
        disabledTools: ["*"],
        model,
        toolsUsed: [],
        hooksFired: [],
        sessionDuration: 0,
      },
    };
  }
}
