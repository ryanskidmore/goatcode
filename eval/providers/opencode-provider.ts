// IMPORTANT: No bun:* imports — this file runs under Node.js via npx promptfoo eval

import { createOpencodeClient } from "@opencode-ai/sdk";

interface OpenCodeProviderConfig {
  enablePlugin: boolean;
  disabledHooks: string[];
  disabledTools: string[];
  model: string;
}

interface ProviderResponse {
  output: string;
  tokenUsage: { total: number; prompt: number; completion: number };
  cost: number;
  metadata: Record<string, unknown>;
}

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
      return await this._callLive(prompt, cfg, startTime);
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

  private async _callLive(
    prompt: string,
    cfg: OpenCodeProviderConfig,
    startTime: number,
  ): Promise<ProviderResponse> {
    const client = createOpencodeClient();

    const createResult = await client.session.create({
      body: { title: `eval-${Date.now()}` },
      query: { directory: process.cwd() },
    });

    const session = (createResult as any).data;
    if (!session?.id) {
      throw new Error(
        `Session creation failed: ${JSON.stringify((createResult as any).error ?? createResult)}`,
      );
    }

    const sessionId: string = session.id;

    const promptResult = await client.session.prompt({
      body: {
        parts: [{ type: "text" as const, text: prompt }],
      },
      path: { id: sessionId },
      query: { directory: process.cwd() },
    });

    const response = (promptResult as any).data;
    if (!response) {
      throw new Error(
        `Prompt failed: ${JSON.stringify((promptResult as any).error ?? promptResult)}`,
      );
    }

    const parts: any[] = response.parts ?? [];
    const textParts = parts.filter((p: any) => p.type === "text");
    const outputText = textParts.map((p: any) => p.text).join("\n") || "[No text output]";

    const toolParts = parts.filter((p: any) => p.type === "tool");
    const toolsUsed = toolParts.map((p: any) => p.tool);

    const info = response.info;
    const tokens = info?.tokens ?? { input: 0, output: 0, reasoning: 0 };
    const totalTokens = tokens.input + tokens.output + (tokens.reasoning ?? 0);

    return {
      output: outputText,
      tokenUsage: {
        total: totalTokens,
        prompt: tokens.input,
        completion: tokens.output,
      },
      cost: info?.cost ?? 0,
      metadata: {
        mock: false,
        toolsUsed,
        hooksFired: [],
        sessionDuration: Date.now() - startTime,
        sessionId,
        pluginEnabled: cfg.enablePlugin,
        disabledHooks: cfg.disabledHooks,
        disabledTools: cfg.disabledTools,
        model: cfg.model,
        finishReason: info?.finish,
      },
    };
  }
}
