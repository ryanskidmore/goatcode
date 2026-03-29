import type { PluginHookContributions } from "../../types/hook";
import { log } from "../../shared/logger";

type MessagesTransformHook = NonNullable<
  PluginHookContributions["experimental.chat.messages.transform"]
>;

interface MessagePart {
  type: string;
  thinking?: string;
  text?: string;
  [key: string]: unknown;
}

interface MessageEntry {
  info: {
    role: string;
    id: string;
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

function isThinkingPart(part: MessagePart): boolean {
  return part.type === "thinking" || part.type === "reasoning";
}

function isWellFormedThinkingPart(part: MessagePart): boolean {
  const content = part.thinking ?? part.text;
  return typeof content === "string" && content.trim().length > 0;
}

function stripMalformedThinkingParts(parts: MessagePart[]): {
  filtered: MessagePart[];
  removedCount: number;
} {
  let removedCount = 0;
  const filtered = parts.filter((part) => {
    if (!isThinkingPart(part)) return true;
    if (isWellFormedThinkingPart(part)) return true;
    removedCount++;
    return false;
  });
  return { filtered, removedCount };
}

export function createThinkingBlockValidatorHandler(): MessagesTransformHook {
  return async (_input: unknown, output: unknown) => {
    if (!isRecord(output)) {
      return;
    }

    const messages = output.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      return;
    }

    let totalRemoved = 0;

    for (const msg of messages) {
      if (!isMessageEntry(msg)) {
        continue;
      }

      if (msg.info.role !== "assistant") {
        continue;
      }

      const { filtered, removedCount } = stripMalformedThinkingParts(msg.parts);
      if (removedCount > 0) {
        msg.parts = filtered;
        totalRemoved += removedCount;
      }
    }

    if (totalRemoved > 0) {
      log("[thinking-block-validator] stripped malformed thinking blocks", {
        count: totalRemoved,
      });
    }
  };
}
