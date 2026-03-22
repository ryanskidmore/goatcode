import type { OpenCodeContext } from "../../types/plugin"

import { log } from "../../shared/logger"

import type { LaunchInput } from "./types"

export type SpawnResult = {
  sessionId: string
}

export async function spawnBackgroundSession(
  ctx: OpenCodeContext,
  input: LaunchInput,
): Promise<SpawnResult> {
  log("[spawner] Spawning background session", {
    id: input.id,
    model: input.model,
  })

  const createResult = await ctx.client.session.create({
    body: {
      title: `bg:${input.id}`,
    },
    query: {
      directory: ctx.directory,
    },
  })

  if (createResult.error) {
    throw new Error(`Failed to create background session: ${String(createResult.error)}`)
  }

  const sessionId = createResult.data.id

  const promptResult = await ctx.client.session.promptAsync({
    path: { id: sessionId },
    body: {
      parts: [{ type: "text", text: input.prompt }],
    },
  })

  if (promptResult.error) {
    throw new Error(`Failed to send prompt to background session: ${String(promptResult.error)}`)
  }

  return { sessionId }
}
