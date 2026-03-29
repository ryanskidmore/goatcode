import type { Message, Part, Todo } from "@opencode-ai/sdk";
import type { SessionSummary, SearchMatch, SessionDetail } from "./types";

type TextPart = Part & { type: "text"; text: string };
type ReasoningPart = Part & { type: "reasoning"; text: string };
type ThinkingPart = Part & { type: "thinking"; thinking?: string; text?: string };
type ToolPart = Part & {
  type: "tool";
  tool: string;
  state: { status: string; input?: Record<string, unknown> };
};

function isTextPart(part: Part): part is TextPart {
  return part.type === "text" && typeof (part as { text?: unknown }).text === "string";
}

function isReasoningPart(part: Part): part is ReasoningPart {
  return part.type === "reasoning" && typeof (part as { text?: unknown }).text === "string";
}

function isThinkingPart(part: Part): part is ThinkingPart {
  const type = (part as { type?: unknown }).type;
  if (type !== "thinking") return false;
  const thinking = (part as { thinking?: unknown }).thinking;
  const text = (part as { text?: unknown }).text;
  return typeof thinking === "string" || typeof text === "string";
}

function isToolPart(part: Part): part is ToolPart {
  if (part.type !== "tool") {
    return false;
  }
  const tool = (part as { tool?: unknown }).tool;
  const state = (part as { state?: unknown }).state;
  if (typeof tool !== "string") {
    return false;
  }
  if (typeof state !== "object" || state === null || Array.isArray(state)) {
    return false;
  }
  const status = (state as { status?: unknown }).status;
  if (typeof status !== "string") {
    return false;
  }
  const input = (state as { input?: unknown }).input;
  return (
    input === undefined || (typeof input === "object" && input !== null && !Array.isArray(input))
  );
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toISOString().split("T")[0];
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

function safeTruncateJson(value: Record<string, unknown>, max = 100): string {
  try {
    return JSON.stringify(value).substring(0, max);
  } catch {
    return "[unserializable tool input]";
  }
}

function computeDurationLabel(firstMs: number, lastMs: number): string | null {
  const diff = lastMs - firstMs;
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? "s" : ""}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
  return parts.length > 0 ? parts.join(", ") : null;
}

export function extractTextFromParts(parts: Part[]): string {
  return parts
    .filter(isTextPart)
    .map((p) => p.text)
    .join(" ")
    .trim();
}

export function extractAgentsFromMessages(
  messages: Array<{ info: Message; parts: Part[] }>,
): string[] {
  const agents = new Set<string>();
  for (const { info } of messages) {
    if (info.role === "user" && "agent" in info && info.agent) {
      agents.add(info.agent);
    }
  }
  return Array.from(agents);
}

export function buildSessionSummary(
  id: string,
  messages: Array<{ info: Message; parts: Part[] }>,
): SessionSummary {
  const timestamps = messages
    .map((m) => m.info.time.created)
    .filter((t): t is number => typeof t === "number");

  const firstDate = timestamps.length > 0 ? formatDate(Math.min(...timestamps)) : null;
  const lastDate = timestamps.length > 0 ? formatDate(Math.max(...timestamps)) : null;
  const agentsUsed = extractAgentsFromMessages(messages);

  return {
    id,
    messageCount: messages.length,
    firstDate,
    lastDate,
    agentsUsed,
  };
}

export function formatSessionList(summaries: SessionSummary[]): string {
  if (summaries.length === 0) {
    return "No sessions found.";
  }

  const headers = ["Session ID", "Messages", "First", "Last", "Agents"];
  const rows = summaries.map((s) => [
    s.id,
    s.messageCount.toString(),
    s.firstDate ?? "N/A",
    s.lastDate ?? "N/A",
    s.agentsUsed.join(", ") || "none",
  ]);

  const colWidths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));

  const formatRow = (cells: string[]): string =>
    "| " + cells.map((cell, i) => cell.padEnd(colWidths[i])).join(" | ") + " |";

  const separator = "|" + colWidths.map((w) => "-".repeat(w + 2)).join("|") + "|";

  return [formatRow(headers), separator, ...rows.map(formatRow)].join("\n");
}

export function formatMessages(
  sessionId: string,
  messages: Array<{ info: Message; parts: Part[] }>,
  options: { includeTodos?: boolean; todos?: Todo[] } = {},
): string {
  if (messages.length === 0) {
    return "No messages found in this session.";
  }

  const lines: string[] = [`Session: ${sessionId}`, `Messages: ${messages.length}`];

  for (const { info, parts } of messages) {
    const ts = formatTimestamp(info.time.created);
    const agent = info.role === "user" && "agent" in info && info.agent ? ` (${info.agent})` : "";
    lines.push(`\n[Message ${info.id}] ${info.role}${agent} (${ts})`);

    for (const part of parts) {
      if (isTextPart(part)) {
        const text = part.text.trim();
        if (text) lines.push(text);
      } else if (isReasoningPart(part) || isThinkingPart(part)) {
        const text =
          (part as { thinking?: string; text?: string }).thinking ??
          (part as { text?: string }).text ??
          "";
        lines.push(`[thinking] ${text.substring(0, 200)}...`);
      } else if (isToolPart(part)) {
        const tp = part;
        const inputStr = tp.state.input ? safeTruncateJson(tp.state.input, 100) : "";
        lines.push(`[tool: ${tp.tool}] ${inputStr}`);
      }
    }
  }

  if (options.includeTodos && options.todos && options.todos.length > 0) {
    lines.push("\n\n=== Todos ===");
    for (const todo of options.todos) {
      const mark =
        todo.status === "completed" ? "[x]" : todo.status === "in_progress" ? "[-]" : "[ ]";
      lines.push(`${mark} [${todo.status}] ${todo.content}`);
    }
  }

  return lines.join("\n");
}

export function formatSearchResults(matches: SearchMatch[]): string {
  if (matches.length === 0) {
    return "No matches found.";
  }

  const lines: string[] = [
    `Found ${matches.length} match${matches.length !== 1 ? "es" : ""} across sessions:\n`,
  ];

  for (const match of matches) {
    const ts = match.timestamp ? ` ${match.timestamp}` : "";
    lines.push(`[${match.sessionId}] Message ${match.messageId} (${match.role})${ts}`);
    lines.push(`  ...${match.excerpt}...`);
    lines.push(`  Matches: ${match.matchCount}\n`);
  }

  return lines.join("\n");
}

export function formatSessionDetail(detail: SessionDetail): string {
  const lines: string[] = [
    `Session ID: ${detail.id}`,
    `Messages: ${detail.messageCount}`,
    `Date Range: ${detail.firstDate ?? "N/A"} to ${detail.lastDate ?? "N/A"}`,
  ];

  if (detail.durationLabel) {
    lines.push(`Duration: ${detail.durationLabel}`);
  }

  lines.push(`Agents Used: ${detail.agentsUsed.join(", ") || "none"}`);

  if (detail.hasTodos) {
    lines.push(
      `Has Todos: Yes (${detail.todoCount} items, ${detail.completedTodoCount} completed)`,
    );
  } else {
    lines.push("Has Todos: No");
  }

  lines.push(`Has Transcript: ${detail.hasTranscript ? "Yes" : "No"}`);

  return lines.join("\n");
}

export function buildSessionDetail(
  id: string,
  messages: Array<{ info: Message; parts: Part[] }>,
  todos: Todo[],
  hasTranscript: boolean,
): SessionDetail {
  const timestamps = messages
    .map((m) => m.info.time.created)
    .filter((t): t is number => typeof t === "number");

  const firstMs = timestamps.length > 0 ? Math.min(...timestamps) : null;
  const lastMs = timestamps.length > 0 ? Math.max(...timestamps) : null;

  const firstDate = firstMs !== null ? formatDate(firstMs) : null;
  const lastDate = lastMs !== null ? formatDate(lastMs) : null;
  const durationLabel =
    firstMs !== null && lastMs !== null ? computeDurationLabel(firstMs, lastMs) : null;
  const agentsUsed = extractAgentsFromMessages(messages);
  const completedTodoCount = todos.filter((t) => t.status === "completed").length;

  return {
    id,
    messageCount: messages.length,
    firstDate,
    lastDate,
    durationLabel,
    agentsUsed,
    hasTodos: todos.length > 0,
    todoCount: todos.length,
    completedTodoCount,
    hasTranscript,
  };
}

export function searchMessages(
  sessionId: string,
  messages: Array<{ info: Message; parts: Part[] }>,
  query: string,
  caseSensitive: boolean,
  maxResults: number,
): SearchMatch[] {
  const results: SearchMatch[] = [];
  if (query.trim() === "" || maxResults <= 0) return results;
  const searchQuery = caseSensitive ? query : query.toLowerCase();

  for (const { info, parts } of messages) {
    if (results.length >= maxResults) break;

    let matchCount = 0;
    let firstExcerpt = "";

    for (const part of parts) {
      if (!isTextPart(part)) continue;
      const rawText = part.text;
      const text = caseSensitive ? rawText : rawText.toLowerCase();
      const occurrences = text.split(searchQuery).length - 1;
      if (occurrences === 0) continue;

      matchCount += occurrences;

      if (!firstExcerpt) {
        const idx = text.indexOf(searchQuery);
        const start = Math.max(0, idx - 50);
        const end = Math.min(rawText.length, idx + searchQuery.length + 50);
        firstExcerpt = rawText.substring(start, end);
      }
    }

    if (matchCount > 0) {
      results.push({
        sessionId,
        messageId: info.id,
        role: info.role,
        excerpt: firstExcerpt,
        matchCount,
        timestamp: formatTimestamp(info.time.created),
      });
    }
  }

  return results;
}
