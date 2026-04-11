import type { Session, Message, Part, Todo } from "@opencode-ai/sdk";

export type { Session, Message, Part, Todo };

export interface SessionSummary {
  id: string;
  messageCount: number;
  firstDate: string | null;
  lastDate: string | null;
  agentsUsed: string[];
}

export interface MessageSummary {
  id: string;
  role: string;
  agent: string | undefined;
  timestamp: string;
  textContent: string;
}

export interface SearchMatch {
  sessionId: string;
  messageId: string;
  role: string;
  excerpt: string;
  matchCount: number;
  timestamp: string | null;
}

export interface SessionDetail {
  id: string;
  messageCount: number;
  firstDate: string | null;
  lastDate: string | null;
  durationLabel: string | null;
  agentsUsed: string[];
  hasTodos: boolean;
  todoCount: number;
  completedTodoCount: number;
}
