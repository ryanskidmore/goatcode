import type { OpenCodeContext } from "../../../types/plugin";
import type { Session, Message, Part } from "@opencode-ai/sdk";
import type { SessionSearchArgs } from "./types";
import type { SearchMatch } from "../types";
import { searchMessages, formatSearchResults } from "../session-formatter";
import { log } from "../../../shared/logger";

const MAX_SESSIONS_TO_SCAN = 50;
export const SEARCH_TIMEOUT_MS = 60_000;
const TIMEOUT_MESSAGE =
  "Search timed out after 60s. Try narrowing your query or using a smaller session list.";

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

export async function handleSessionSearch(
  args: SessionSearchArgs,
  ctx: OpenCodeContext,
  timeoutMs: number = SEARCH_TIMEOUT_MS,
): Promise<string> {
  try {
    const resultLimit = args.limit && args.limit > 0 ? args.limit : 20;
    const caseSensitive = args.case_sensitive ?? false;

    const searchOperation = async (): Promise<string> => {
      let results: SearchMatch[];
      if (args.session_id) {
        results = await searchInSession(
          ctx,
          args.session_id,
          args.query,
          caseSensitive,
          resultLimit,
        );
      } else {
        const listResponse = await ctx.client.session.list({ query: { directory: ctx.directory } });
        const sessions: Session[] = listResponse.data ?? [];
        const sessionsToScan = sessions.slice(0, MAX_SESSIONS_TO_SCAN);

        const allResults: SearchMatch[] = [];
        for (const session of sessionsToScan) {
          if (allResults.length >= resultLimit) break;
          const remaining = resultLimit - allResults.length;
          const sessionResults = await searchInSession(
            ctx,
            session.id,
            args.query,
            caseSensitive,
            remaining,
          );
          allResults.push(...sessionResults);
        }

        results = allResults.slice(0, resultLimit);
      }
      return formatSearchResults(results);
    };

    const timeoutPromise = new Promise<string>((resolve) =>
      setTimeout(() => resolve(TIMEOUT_MESSAGE), timeoutMs),
    );

    return await Promise.race([searchOperation(), timeoutPromise]);
  } catch (e) {
    log("session_search error", e);
    return `Error: ${e instanceof Error ? e.message : String(e)}`;
  }
}
