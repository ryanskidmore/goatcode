import type { OpenCodeContext } from "../../../types/plugin";
import type { Session, Message, Part } from "@opencode-ai/sdk";
import type { SessionSearchArgs } from "./types";
import type { SearchMatch } from "../types";
import { searchMessages, formatSearchResults } from "../session-formatter";
import { log } from "../../../shared/logger";

const MAX_SESSIONS_TO_SCAN = 50;
const SEARCH_TIMEOUT_MS = 60_000;

async function searchInSession(
  ctx: OpenCodeContext,
  sessionId: string,
  query: string,
  caseSensitive: boolean,
  maxResults: number,
): Promise<SearchMatch[]> {
  const response = await ctx.client.session.messages({ path: { id: sessionId } });
  const messages: Array<{ info: Message; parts: Part[] }> = response.data ?? [];
  return searchMessages(sessionId, messages, query, caseSensitive, maxResults);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Search timed out after ${ms}ms`)), ms),
    ),
  ]);
}

export async function handleSessionSearch(
  args: SessionSearchArgs,
  ctx: OpenCodeContext,
): Promise<string> {
  try {
    const resultLimit = args.limit && args.limit > 0 ? args.limit : 20;
    const caseSensitive = args.case_sensitive ?? false;

    const searchOperation = async (): Promise<SearchMatch[]> => {
      if (args.session_id) {
        return searchInSession(ctx, args.session_id, args.query, caseSensitive, resultLimit);
      }

      const listResponse = await ctx.client.session.list({ query: { directory: ctx.directory } });
      const sessions: Session[] = listResponse.data ?? [];
      const sessionsToScan = sessions.slice(0, MAX_SESSIONS_TO_SCAN);

      const allResults: SearchMatch[] = [];
      for (const session of sessionsToScan) {
        if (allResults.length >= resultLimit) break;
        const remaining = resultLimit - allResults.length;
        const results = await searchInSession(
          ctx,
          session.id,
          args.query,
          caseSensitive,
          remaining,
        );
        allResults.push(...results);
      }

      return allResults.slice(0, resultLimit);
    };

    const results = await withTimeout(searchOperation(), SEARCH_TIMEOUT_MS);
    return formatSearchResults(results);
  } catch (e) {
    log("session_search error", e);
    return `Error: ${e instanceof Error ? e.message : String(e)}`;
  }
}
