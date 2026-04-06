import type { OpenCodeContext } from "../../types/plugin";

import { log } from "../../shared/logger";
import { awaitDiscovery } from "../../shared/provider-discovery";
import { parseModelId, normalizeModel } from "../../shared/model-normalization";
import { qualifyModel } from "../../shared/provider-registry";
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

  // Await discovery so qualifyModel has real provider data before routing.
  // Discovery fires at bootstrap but is non-blocking — delegations that happen
  // before it resolves would otherwise fall through to name-prefix inference
  // (gpt-* → openai) and bypass the user's configured routing (e.g. zen).
  await awaitDiscovery();
  const parsed = parseModelId(qualifyModel(normalizeModel(input.model) ?? input.model));
  const promptResult = await ctx.client.session.promptAsync({
    path: { id: sessionId },
    body: {
      parts: [{ type: "text", text: input.prompt }],
      ...(parsed && { model: { providerID: parsed.provider, modelID: parsed.modelId } }),
    },
  });

  if (promptResult.error) {
    throw new Error(`Failed to send prompt to background session: ${String(promptResult.error)}`);
  }

  return { sessionId };
}
