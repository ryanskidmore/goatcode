import type { PluginHookContributions } from "../../types/hook";
import { log } from "../../shared/logger";

type MessagesTransformHook = NonNullable<
  PluginHookContributions["experimental.chat.messages.transform"]
>;

interface MessagePart {
  type: string;
  id?: string;
  tool_use_id?: string;
  toolUseId?: string;
  [key: string]: unknown;
}

interface MessageEntry {
  info: {
    role: string;
    [key: string]: unknown;
  };
  parts: MessagePart[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMessageEntry(value: unknown): value is MessageEntry {
  if (!isRecord(value)) return false;
  if (!isRecord(value.info)) return false;
  if (!Array.isArray(value.parts)) return false;
  return true;
}

function normalizePartType(type: string): string {
  return type.toLowerCase().replace(/[^a-z]/g, "");
}

function isToolUsePart(part: MessagePart): boolean {
  return normalizePartType(part.type) === "tooluse";
}

function isToolResultPart(part: MessagePart): boolean {
  return normalizePartType(part.type) === "toolresult";
}

function getToolUseId(part: MessagePart): string | null {
  return typeof part.id === "string" && part.id.length > 0 ? part.id : null;
}

function getToolResultUseId(part: MessagePart): string | null {
  if (typeof part.tool_use_id === "string" && part.tool_use_id.length > 0) {
    return part.tool_use_id;
  }
  if (typeof part.toolUseId === "string" && part.toolUseId.length > 0) {
    return part.toolUseId;
  }
  return null;
}

function collectToolUseIds(message: MessageEntry): Set<string> {
  const ids = new Set<string>();
  for (const part of message.parts) {
    if (!isToolUsePart(part)) continue;
    const id = getToolUseId(part);
    if (id) ids.add(id);
  }
  return ids;
}

function collectToolResultIds(message: MessageEntry): Set<string> {
  const ids = new Set<string>();
  for (const part of message.parts) {
    if (!isToolResultPart(part)) continue;
    const id = getToolResultUseId(part);
    if (id) ids.add(id);
  }
  return ids;
}

export function createToolPairingValidatorHandler(): MessagesTransformHook {
  return async (_input: unknown, output: unknown) => {
    if (!isRecord(output)) return;
    const rawMessages = output.messages;
    if (!Array.isArray(rawMessages) || rawMessages.length === 0) return;

    const messages = rawMessages.filter(isMessageEntry);
    if (messages.length === 0) return;

    let removedToolUses = 0;
    let removedToolResults = 0;

    for (let index = 0; index < messages.length; index += 1) {
      const current = messages[index];
      const prev = index > 0 ? messages[index - 1] : null;
      const next = index + 1 < messages.length ? messages[index + 1] : null;

      if (current.info.role === "assistant") {
        const toolUseIds = collectToolUseIds(current);
        if (toolUseIds.size === 0) continue;

        const nextIsUser = next?.info.role === "user";
        const nextResultIds = nextIsUser ? collectToolResultIds(next) : new Set<string>();

        const validUseIds = new Set<string>();
        for (const id of toolUseIds) {
          if (nextResultIds.has(id)) validUseIds.add(id);
        }

        const beforeUseCount = current.parts.length;
        current.parts = current.parts.filter((part) => {
          if (!isToolUsePart(part)) return true;
          const id = getToolUseId(part);
          return !!id && validUseIds.has(id);
        });
        removedToolUses += beforeUseCount - current.parts.length;

        if (nextIsUser) {
          const beforeResultCount = next.parts.length;
          next.parts = next.parts.filter((part) => {
            if (!isToolResultPart(part)) return true;
            const id = getToolResultUseId(part);
            return !!id && validUseIds.has(id);
          });
          removedToolResults += beforeResultCount - next.parts.length;
        }
        continue;
      }

      if (current.info.role === "user") {
        const hasToolResults = current.parts.some(isToolResultPart);
        if (!hasToolResults) continue;

        const prevUseIds = prev?.info.role === "assistant" ? collectToolUseIds(prev) : new Set<string>();
        const beforeResultCount = current.parts.length;
        current.parts = current.parts.filter((part) => {
          if (!isToolResultPart(part)) return true;
          const id = getToolResultUseId(part);
          return !!id && prevUseIds.has(id);
        });
        removedToolResults += beforeResultCount - current.parts.length;
      }
    }

    if (removedToolUses > 0 || removedToolResults > 0) {
      log("[tool-pairing-validator] repaired invalid tool_use/tool_result pairing", {
        removedToolUses,
        removedToolResults,
      });
    }
  };
}
