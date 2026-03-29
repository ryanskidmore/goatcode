import type { PluginHookContributions } from "../../types/hook";

type MessagesTransformHook = NonNullable<
  PluginHookContributions["experimental.chat.messages.transform"]
>;

export const PHASE_REMINDER = `<reminder>Recall Workflow Rules:
Understand → choose best path (delegate by rules and parallelize independent work) → execute → verify.
If mentioning a specialist, launch it in the same turn.</reminder>`;

const REMINDER_PREFIX = "<reminder>Recall Workflow Rules:";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isOrchestratorAgent(agent: unknown): boolean {
  if (typeof agent !== "string") return true;
  return agent.toLowerCase() === "orchestrator";
}

function prependReminder(text: string): string {
  if (text.includes(REMINDER_PREFIX)) {
    return text;
  }
  return `${PHASE_REMINDER}\n\n---\n\n${text}`;
}

export function createPhaseReminderHandler(): MessagesTransformHook {
  return async (_input: unknown, output: unknown) => {
    if (!isRecord(output)) return;

    const messages = output.messages;
    if (!Array.isArray(messages) || messages.length === 0) return;

    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (!isRecord(message)) continue;

      const info = message.info;
      if (!isRecord(info) || info.role !== "user") continue;
      if (!isOrchestratorAgent(info.agent)) return;

      const parts = message.parts;
      if (!Array.isArray(parts)) return;

      const textPart = parts.find((part) => part?.type === "text" && typeof part.text === "string");
      if (!textPart || typeof textPart.text !== "string") return;

      textPart.text = prependReminder(textPart.text);
      return;
    }
  };
}
