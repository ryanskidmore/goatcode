import type { OpenCodeContext } from "../../types/plugin";
import type { ToolDefinition } from "@opencode-ai/plugin";

type JsonRecord = Record<string, unknown>;

type ToolCaller = {
  call?: (input: { name: string; arguments: JsonRecord }) => Promise<unknown>;
};

function asRecord(value: unknown): JsonRecord | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  return value as JsonRecord;
}

function asFunction(value: unknown): ((...args: unknown[]) => Promise<unknown> | unknown) | null {
  if (typeof value !== "function") {
    return null;
  }
  return (...args: unknown[]) => value(...args);
}

function unwrapClientResponse(result: unknown): unknown {
  const record = asRecord(result);
  if (!record) {
    return result;
  }

  if (record.error !== undefined && record.error !== null) {
    throw new Error(String(record.error));
  }

  if ("data" in record) {
    return record.data;
  }

  return result;
}

async function callMethod(
  methodOwner: JsonRecord,
  methodName: string,
  args: JsonRecord,
): Promise<unknown> {
  const maybeMethod = asFunction(methodOwner[methodName]);
  if (!maybeMethod) {
    return undefined;
  }

  const methodResult = await maybeMethod(args);
  return unwrapClientResponse(methodResult);
}

async function callToolExecutor(
  toolHost: unknown,
  toolName: string,
  args: JsonRecord,
): Promise<unknown> {
  const toolRecord = asRecord(toolHost);
  if (!toolRecord) {
    return undefined;
  }

  const caller = toolRecord as ToolCaller;
  if (!caller.call) {
    return undefined;
  }

  const callResult = await caller.call({
    name: toolName,
    arguments: args,
  });
  return unwrapClientResponse(callResult);
}

export async function callLspClient(
  client: OpenCodeContext["client"],
  toolName: string,
  directMethodName: string,
  args: JsonRecord,
): Promise<unknown> {
  const clientRecord = asRecord(client);
  if (!clientRecord) {
    throw new Error("OpenCode client is unavailable");
  }

  const directResult = await callMethod(clientRecord, directMethodName, args);
  if (directResult !== undefined) {
    return directResult;
  }

  const lspHost = asRecord(clientRecord.lsp);
  if (lspHost) {
    const lspResult = await callMethod(lspHost, directMethodName, args);
    if (lspResult !== undefined) {
      return lspResult;
    }

    const legacyLspResult = await callMethod(lspHost, toolName, args);
    if (legacyLspResult !== undefined) {
      return legacyLspResult;
    }
  }

  const toolResult = await callToolExecutor(clientRecord.tool, toolName, args);
  if (toolResult !== undefined) {
    return toolResult;
  }

  const toolsResult = await callToolExecutor(clientRecord.tools, toolName, args);
  if (toolsResult !== undefined) {
    return toolsResult;
  }

  throw new Error(`LSP client method unavailable: ${toolName}`);
}

export function getClientFromToolContext(
  context: Parameters<ToolDefinition["execute"]>[1],
): OpenCodeContext["client"] {
  const contextRecord = asRecord(context);
  if (!contextRecord) {
    throw new Error("Tool context is unavailable");
  }

  const client = contextRecord.client;
  if (!client) {
    throw new Error("Tool context does not expose OpenCode client");
  }

  return client as OpenCodeContext["client"];
}

export function formatLspResult(result: unknown): string {
  if (result === null || result === undefined) {
    return "No result";
  }

  if (typeof result === "string") {
    return result;
  }

  return JSON.stringify(result, null, 2);
}
