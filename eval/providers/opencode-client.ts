// IMPORTANT: No bun:* imports — this file runs under Node.js via npx promptfoo eval

import {
  createOpencodeClient,
  type Part,
  type Session,
  type TextPart,
  type ToolPart,
} from "@opencode-ai/sdk";

export interface OpenCodeProviderConfig {
  enablePlugin: boolean;
  disabledHooks: string[];
  disabledTools: string[];
  model: string;
}

export interface ProviderResponse {
  output: string;
  tokenUsage: { total: number; prompt: number; completion: number };
  cost: number;
  metadata: Record<string, unknown>;
}

interface SdkResult<T> {
  data?: T;
  error?: unknown;
}

interface PromptInfo {
  tokens?: { input: number; output: number; reasoning?: number };
  cost?: number;
  finish?: string;
}

interface PromptData {
  parts?: Part[];
  info?: PromptInfo;
}

export async function callLive(
  prompt: string,
  cfg: OpenCodeProviderConfig,
  startTime: number,
): Promise<ProviderResponse> {
  const client = createOpencodeClient();

  const createResult = (await client.session.create({
    body: { title: `eval-${Date.now()}` },
    query: { directory: process.cwd() },
  })) as SdkResult<Session>;

  const session = createResult.data;
  if (!session?.id) {
    throw new Error(
      `Session creation failed: ${JSON.stringify(createResult.error ?? createResult)}`,
    );
  }

  const sessionId = session.id;

  const promptResult = (await client.session.prompt({
    body: {
      parts: [{ type: "text" as const, text: prompt }],
    },
    path: { id: sessionId },
    query: { directory: process.cwd() },
  })) as SdkResult<PromptData>;

  const response = promptResult.data;
  if (!response) {
    throw new Error(
      `Prompt failed: ${JSON.stringify(promptResult.error ?? promptResult)}`,
    );
  }

  const parts: Part[] = response.parts ?? [];
  const textParts = parts.filter((p): p is TextPart => p.type === "text");
  const outputText = textParts.map((p) => p.text).join("\n") || "[No text output]";

  const toolParts = parts.filter((p): p is ToolPart => p.type === "tool");
  const toolsUsed = toolParts.map((p) => p.tool);

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
      // NOTE: The OpenCode SDK does not support per-session plugin configuration.
      // enablePlugin/disabledHooks/disabledTools are stored in metadata only.
      // In a production setup, this would require modifying opencode.json and restarting the server.
      pluginEnabled: cfg.enablePlugin,
      disabledHooks: cfg.disabledHooks,
      disabledTools: cfg.disabledTools,
      model: cfg.model,
      finishReason: info?.finish,
    },
  };
}
