import type { OpenCodeContext } from "../../types/plugin";

import { log } from "../../shared/logger";

import type { LaunchInput } from "./types";

export type SpawnResult = {
  sessionId: string;
};

export async function spawnBackgroundSession(
  ctx: OpenCodeContext,
  input: LaunchInput,
): Promise<SpawnResult> {
  log("[spawner] Spawning background session", {
    id: input.id,
    model: input.model,
  });

  const createResult = await ctx.client.session.create({
    body: {
      title: input.title ?? `bg:${input.id}`,
      ...(input.parentSessionID ? { parentID: input.parentSessionID } : {}),
    },
    query: {
      directory: ctx.directory,
    },
  });

  if (createResult.error) {
    throw new Error(`Failed to create background session: ${String(createResult.error)}`);
  }

  const sessionId = createResult.data.id;

  // Route through the opencode provider (zen) rather than inferring the native
  // provider from the model name prefix, which would bypass zen routing.
  const promptResult = await ctx.client.session.promptAsync({
    path: { id: sessionId },
    body: {
      parts: [{ type: "text", text: input.prompt }],
      ...(input.model && { model: { providerID: "opencode", modelID: input.model } }),
    },
  });

  if (promptResult.error) {
    throw new Error(`Failed to send prompt to background session: ${String(promptResult.error)}`);
  }

  return { sessionId };
}
