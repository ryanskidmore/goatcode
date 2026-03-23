import type { OpenCodeContext } from "../../../types/plugin"
import type { Message, Part, Todo } from "@opencode-ai/sdk"
import type { SessionReadArgs } from "./types"
import { formatMessages } from "../session-formatter"
import { log } from "../../../shared/logger"

export async function handleSessionRead(args: SessionReadArgs, ctx: OpenCodeContext): Promise<string> {
  try {
    const msgResponse = await ctx.client.session.messages({ path: { id: args.session_id } })
    if (msgResponse.error) {
      return `Session not found: ${args.session_id}`
    }
    let messages: Array<{ info: Message; parts: Part[] }> = msgResponse.data ?? []

    if (args.limit && args.limit > 0) {
      messages = messages.slice(0, args.limit)
    }

    let todos: Todo[] | undefined
    if (args.include_todos) {
      const todoResponse = await ctx.client.session.todo({ path: { id: args.session_id } })
      todos = todoResponse.data ?? []
    }

    return formatMessages(args.session_id, messages, {
      includeTodos: args.include_todos,
      todos,
    })
  } catch (e) {
    log("session_read error", e)
    return `Error: ${e instanceof Error ? e.message : String(e)}`
  }
}
