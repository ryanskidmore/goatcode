import type { OpenCodeContext } from "../../types/plugin"
import type { BackgroundAgentManager } from "../../features/background-agent/manager"
import type { TaskInput, CategoryConfig } from "./types"
import { log } from "../../shared/logger"
import { parseModelId } from "../../shared/model-normalization"

export interface ExecutorDeps {
  manager: BackgroundAgentManager
  client: OpenCodeContext["client"]
  directory: string
}

export async function executeBackground(
  input: TaskInput,
  config: CategoryConfig,
  deps: ExecutorDeps,
): Promise<string> {
  const { manager, client, directory } = deps
  const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  log("[delegate-task] Launching background task", {
    taskId,
    category: input.category,
    model: config.model,
  })

  const ctx: OpenCodeContext = { client, directory } as OpenCodeContext
  const task = await manager.launch(ctx, {
    id: taskId,
    prompt: input.prompt,
    model: config.model,
  })

  return formatBackgroundResult(task.id, input, config)
}

function formatBackgroundResult(
  taskId: string,
  input: TaskInput,
  config: CategoryConfig,
): string {
  return [
    "Background task launched.",
    "",
    `Task ID: ${taskId}`,
    `Category: ${input.category}`,
    `Model: ${config.model}${config.variant ? ` (variant: ${config.variant})` : ""}`,
    `Description: ${input.description}`,
    "",
    `Use \`background_output\` with task_id="${taskId}" to check status.`,
  ].join("\n")
}

export async function executeSync(
  input: TaskInput,
  config: CategoryConfig,
  deps: ExecutorDeps,
): Promise<string> {
  const { client, directory } = deps

  log("[delegate-task] Executing sync task", {
    category: input.category,
    model: config.model,
  })

  const createResult = await client.session.create({
    body: { title: `task:${input.category}:${input.description.slice(0, 50)}` },
    query: { directory },
  })

  if (createResult.error) {
    const errorMsg = `Failed to create session: ${String(createResult.error)}`
    log("[delegate-task] Session creation failed", { error: errorMsg })
    return errorMsg
  }

  const sessionId = createResult.data.id
  const parsed = parseModelId(config.model)

  const promptResult = await client.session.promptAsync({
    path: { id: sessionId },
    body: {
      parts: [{ type: "text", text: input.prompt }],
      ...(parsed && { model: { providerID: parsed.provider, modelID: parsed.modelId } }),
    },
  })

  if (promptResult.error) {
    const errorMsg = `Failed to send prompt: ${String(promptResult.error)}`
    log("[delegate-task] Prompt send failed", { error: errorMsg, sessionId })
    return errorMsg
  }

  return await pollForResult(client, directory, sessionId)
}

const POLL_INTERVAL_MS = 2_000
const MAX_POLL_DURATION_MS = 5 * 60 * 1_000

async function pollForResult(
  client: OpenCodeContext["client"],
  directory: string,
  sessionId: string,
): Promise<string> {
  const start = Date.now()

  while (Date.now() - start < MAX_POLL_DURATION_MS) {
    const statusResult = await client.session.status({
      query: { directory },
    })

    const sessionStatus = statusResult.data?.[sessionId]?.type
    if (!sessionStatus || sessionStatus === "idle") {
      return await fetchLastAssistantMessage(client, sessionId)
    }
    if (sessionStatus !== "busy" && sessionStatus !== "retry") {
      return await fetchLastAssistantMessage(client, sessionId)
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  }

  return `Task timed out after ${MAX_POLL_DURATION_MS / 1_000}s. Session: ${sessionId}`
}

type SessionMessage = {
  role?: string
  content?: string
}

async function fetchLastAssistantMessage(
  client: OpenCodeContext["client"],
  sessionId: string,
): Promise<string> {
  const messagesResult = await client.session.messages({
    path: { id: sessionId },
  })

  const messages = (messagesResult.data ?? []) as SessionMessage[]
  const lastAssistant = [...messages]
    .reverse()
    .find((m) => m.role === "assistant")

  return lastAssistant?.content ?? "Task completed but no response was returned."
}
