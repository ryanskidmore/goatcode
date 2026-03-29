import { mock } from "bun:test";
import type { ToolDefinition } from "@opencode-ai/plugin";
import { createMockSdkClient } from "./mock-sdk-client";

/**
 * Create a minimal mock tool context for unit testing.
 * Provides sensible defaults for all required context fields.
 */
export function createMockToolContext(
  overrides: Partial<Parameters<ToolDefinition["execute"]>[1]> = {}
): Parameters<ToolDefinition["execute"]>[1] {
  return {
    sessionID: "ses_test",
    messageID: "msg_test",
    agent: "test-agent",
    directory: "/tmp/test-project",
    worktree: "/tmp/test-project",
    abort: new AbortController().signal,
    metadata: mock(() => {}),
    ask: mock(async () => {}),
    client: createMockSdkClient(),
    ...overrides,
  } as unknown as Parameters<ToolDefinition["execute"]>[1];
}
