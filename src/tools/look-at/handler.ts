import { tool, type ToolDefinition } from "@opencode-ai/plugin";
import { log } from "../../shared/logger";
import { getClientFromToolContext } from "../lsp/client";
import { pollUntilStable, type PollSnapshot } from "../../runtime";
import { LOOK_AT_DESCRIPTION, LOOK_AT_AGENT_NAME } from "./types";

export type Poller = (fetchSnapshot: () => Promise<PollSnapshot>) => Promise<PollSnapshot>;

type SessionMessage = {
  role?: string;
  content?: string;
};

type SessionStatusRecord = Record<string, { type?: string }>;

const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".bmp",
  ".tiff",
  ".tif",
  ".pdf",
  ".ico",
  ".svg",
]);

function isBinaryPath(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  for (const ext of BINARY_EXTENSIONS) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
}

function buildPrompt(goal: string, isImage: boolean): string {
  const subject = isImage ? "image" : "file";
  return `Analyze this ${subject} and extract the requested information.\n\nGoal: ${goal}\n\nProvide ONLY the extracted information that matches the goal.\nBe thorough on what was requested, concise on everything else.\nIf the requested information is not found, clearly state what is missing.`;
}

export function extractLatestAssistantText(messages: unknown[]): string | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (typeof msg !== "object" || msg === null) continue;
    const record = msg as Record<string, unknown>;
    if (record.role !== "assistant") continue;
    if (typeof record.content === "string" && record.content.length > 0) return record.content;
  }
  return null;
}

function isSessionMessage(value: unknown): value is SessionMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    (record.role === undefined || typeof record.role === "string") &&
    (record.content === undefined || typeof record.content === "string")
  );
}

function toSessionMessages(value: unknown): SessionMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isSessionMessage);
}

function isSessionStatusRecord(value: unknown): value is SessionStatusRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  for (const status of Object.values(value as Record<string, unknown>)) {
    if (typeof status !== "object" || status === null || Array.isArray(status)) {
      return false;
    }
    const type = (status as Record<string, unknown>).type;
    if (type !== undefined && typeof type !== "string") {
      return false;
    }
  }
  return true;
}

async function readFileAsBase64(filePath: string): Promise<string> {
  const file = Bun.file(filePath);
  const buffer = await file.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}

function inferMimeType(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".bmp")) return "image/bmp";
  if (lower.endsWith(".tiff") || lower.endsWith(".tif")) return "image/tiff";
  if (lower.endsWith(".ico")) return "image/x-icon";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

export function createLookAtTool(poller: Poller = pollUntilStable): ToolDefinition {
  return tool({
    description: LOOK_AT_DESCRIPTION,
    args: {
      file_path: tool.schema.string().optional().describe("Absolute path to the file to analyze"),
      goal: tool.schema.string().describe("What specific information to extract from the file"),
      image_data: tool.schema
        .string()
        .optional()
        .describe("Base64 encoded image data (for clipboard/pasted images)"),
    },
    execute: async (args, toolContext) => {
      const filePath = args.file_path;
      const imageData = args.image_data;
      const goal = args.goal;

      if (!filePath && !imageData) return "Error: Must provide either 'file_path' or 'image_data'.";
      if (filePath && imageData)
        return "Error: Provide only one of 'file_path' or 'image_data', not both.";
      if (!goal) return "Error: Missing required parameter 'goal'.";

      const client = getClientFromToolContext(toolContext);
      log(`[look_at] Analyzing ${imageData ? "clipboard/pasted image" : filePath}, goal: ${goal}`);

      let promptText: string;
      let filePart: { type: "file"; mime: string; url: string; filename: string } | null = null;

      if (imageData) {
        const mimeMatch = imageData.match(/^data:([^;]+);base64,/);
        const mime = mimeMatch ? mimeMatch[1] : "image/png";
        const base64 = mimeMatch ? imageData.slice(mimeMatch[0].length) : imageData;
        filePart = {
          type: "file",
          mime,
          url: `data:${mime};base64,${base64}`,
          filename: `clipboard-image.${mime.split("/")[1] ?? "png"}`,
        };
        promptText = buildPrompt(goal, true);
      } else if (filePath) {
        const file = Bun.file(filePath);
        if (!(await file.exists())) {
          log(`[look_at] File not found: ${filePath}`);
          return `Error: File not found: ${filePath}`;
        }
        if (isBinaryPath(filePath)) {
          const base64 = await readFileAsBase64(filePath);
          const mime = inferMimeType(filePath);
          filePart = {
            type: "file",
            mime,
            url: `data:${mime};base64,${base64}`,
            filename: filePath.split("/").pop() ?? "file",
          };
          promptText = buildPrompt(goal, mime.startsWith("image/"));
        } else {
          promptText = `${buildPrompt(goal, false)}\n\nFile contents:\n\`\`\`\n${await file.text()}\n\`\`\``;
        }
      } else {
        return "Error: Must provide either 'file_path' or 'image_data'.";
      }

      const createResult = await client.session.create({
        body: { parentID: toolContext.sessionID, title: `look_at: ${goal.substring(0, 50)}` },
        query: { directory: toolContext.directory },
      });

      if (createResult.error) {
        log(`[look_at] Session create error:`, createResult.error);
        return `Error: Failed to create session: ${createResult.error}`;
      }

      const sessionId = createResult.data.id;
      log(`[look_at] Created session: ${sessionId}`);

      const parts: Array<
        | { type: "text"; text: string }
        | { type: "file"; mime: string; url: string; filename: string }
      > = [{ type: "text", text: promptText }];
      if (filePart) parts.push(filePart);

      try {
        await client.session.promptAsync({
          path: { id: sessionId },
          body: { agent: LOOK_AT_AGENT_NAME, parts },
        });
      } catch (promptError) {
        log(`[look_at] Prompt error:`, promptError);
        const msg = promptError instanceof Error ? promptError.message : String(promptError);
        return `Error: Failed to send prompt to Inspector agent: ${msg}`;
      }

      try {
        await poller(async () => {
          const [messagesResult, statusResult] = await Promise.all([
            client.session.messages({ path: { id: sessionId } }),
            client.session.status({ query: { directory: toolContext.directory } }),
          ]);
          const messages = toSessionMessages(messagesResult.data);
          const statusData = isSessionStatusRecord(statusResult.data)
            ? statusResult.data
            : undefined;
          return {
            messageCount: messages.length,
            isIdle: statusData?.[sessionId]?.type === "idle",
          };
        });
      } catch (pollError) {
        log(`[look_at] Polling error:`, pollError);
        return "Error: Timed out waiting for Inspector agent response";
      }

      const messagesResult = await client.session.messages({ path: { id: sessionId } });
      if (messagesResult.error) return `Error: Failed to get messages: ${messagesResult.error}`;

      const messages = toSessionMessages(messagesResult.data);
      const responseText = extractLatestAssistantText(messages);
      if (!responseText) return "Error: No response from Inspector agent";

      log(`[look_at] Got response, length: ${responseText.length}`);
      return responseText;
    },
  });
}

export const lookAtTool: ToolDefinition = createLookAtTool();
