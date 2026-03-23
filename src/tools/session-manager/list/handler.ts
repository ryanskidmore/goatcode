import type { OpenCodeContext } from "../../../types/plugin"
import type { Session } from "@opencode-ai/sdk"
import type { SessionListArgs } from "./types"
import { buildSessionSummary, formatSessionList } from "../session-formatter"
import { log } from "../../../shared/logger"

function isAfterDate(session: Session, fromDate: string): boolean {
  const from = new Date(fromDate).getTime()
  return session.time.updated >= from
}

function isBeforeDate(session: Session, toDate: string): boolean {
  const to = new Date(toDate).getTime()
  return session.time.updated <= to
}

export async function handleSessionList(args: SessionListArgs, ctx: OpenCodeContext): Promise<string> {
  try {
    const directory = args.project_path ?? ctx.directory
    const response = await ctx.client.session.list({ query: { directory } })
    const sessions: Session[] = response.data ?? []

    let filtered = sessions.filter((s) => !s.parentID)

    if (args.from_date) {
      filtered = filtered.filter((s) => isAfterDate(s, args.from_date!))
    }

    if (args.to_date) {
      filtered = filtered.filter((s) => isBeforeDate(s, args.to_date!))
    }

    filtered.sort((a, b) => b.time.updated - a.time.updated)

    if (args.limit && args.limit > 0) {
      filtered = filtered.slice(0, args.limit)
    }

    const summaryPromises = filtered.map(async (session) => {
      const msgResponse = await ctx.client.session.messages({ path: { id: session.id } })
      const messages = msgResponse.data ?? []
      return buildSessionSummary(session.id, messages)
    })

    const summaries = await Promise.all(summaryPromises)
    return formatSessionList(summaries)
  } catch (e) {
    log("session_list error", e)
    return `Error: ${e instanceof Error ? e.message : String(e)}`
  }
}
