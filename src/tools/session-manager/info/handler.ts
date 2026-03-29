import type { OpenCodeContext } from "../../../types/plugin";
import type { Message, Part, Todo } from "@opencode-ai/sdk";
import type { SessionInfoArgs } from "./types";
import { buildSessionDetail, formatSessionDetail } from "../session-formatter";
import { log } from "../../../shared/logger";

export async function handleSessionInfo(
  args: SessionInfoArgs,
  ctx: OpenCodeContext,
): Promise<string> {
  try {
    const msgResponse = await ctx.client.session.messages({ path: { id: args.session_id } });
    if (msgResponse.error) {
      return `Session not found: ${args.session_id}`;
    }
    const messages: Array<{ info: Message; parts: Part[] }> = msgResponse.data ?? [];

    const todoResponse = await ctx.client.session.todo({ path: { id: args.session_id } });
    const todos: Todo[] = todoResponse.data ?? [];

    const detail = buildSessionDetail(args.session_id, messages, todos, false);
    return formatSessionDetail(detail);
  } catch (e) {
    log("session_info error", e);
    return `Error: ${e instanceof Error ? e.message : String(e)}`;
  }
}
