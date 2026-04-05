import type { OpenCodeContext } from "../../types/plugin";

import { log } from "../../shared/logger";
import { parseModelId } from "../../shared/model-normalization";
import { qualifyModel } from "../../shared/provider-registry";

import type { LaunchInput } from "./types";

export type SpawnResult = {
  sessionId: string;
};

function resolveSessionCreate(
  ctx: OpenCodeContext,
): OpenCodeContext["client"]["session"]["create"] {
  const create = ctx.client.session.create;
  if (typeof create === "function") {
    return create.bind(ctx.client.session);
  }

  const fallback = Reflect.get(ctx.client.session as unknown as Record<string, unknown>, "create");
  if (typeof fallback === "function") {
    return (fallback as OpenCodeContext["client"]["session"]["create"]).bind(ctx.client.session);
  }

  throw new Error("Session create API is unavailable in background spawner");
}

export async function spawnBackgroundSession(
  ctx: OpenCodeContext,
  input: LaunchInput,
): Promise<SpawnResult> {
  log("[spawner] Spawning background session", {
    id: input.id,
    model: input.model,
  });

  const create = resolveSessionCreate(ctx);
  const createResult = await create({
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

  const parsed = parseModelId(qualifyModel(input.model));
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
