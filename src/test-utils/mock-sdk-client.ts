import { mock } from "bun:test";

/**
 * Create a minimal mock SDK client for unit testing.
 * Provides mock methods for all client operations.
 */
export function createMockSdkClient(overrides: Record<string, unknown> = {}) {
  const base = {
    getProviders: mock(async () => []),
    getModels: mock(async () => []),
    getSession: mock(async () => null),
    listSessions: mock(async () => []),
    createSession: mock(async () => ({
      id: "ses_test",
      title: "Test Session",
    })),
    sendMessage: mock(async () => ({})),
    session: {
      create: mock(async () => ({
        data: { id: "sync-session-123" },
        error: undefined,
      })),
      promptAsync: mock(async () => ({
        data: {},
        error: undefined,
      })),
      status: mock(async () => ({
        data: {
          "sync-session-123": { type: "idle" },
        },
      })),
      messages: mock(async () => ({
        data: [
          { role: "user", content: "test prompt" },
          { role: "assistant", content: "task result here" },
        ],
      })),
      delete: mock(async () => ({})),
    },
  };

  const overrideSession = (overrides as { session?: Record<string, unknown> }).session ?? {};

  return {
    ...base,
    ...overrides,
    session: {
      ...base.session,
      ...overrideSession,
    },
  };
}
