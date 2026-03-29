import type { OpenCodeContext } from "../types/plugin";

/**
 * Create a minimal mock OpenCodeContext for unit testing.
 * Provides sensible no-op defaults for all required fields.
 */
export function createMockPluginContext(overrides: Partial<OpenCodeContext> = {}): OpenCodeContext {
  const mock = {
    directory: "/tmp/test-project",
    client: {
      getProviders: async () => [],
      getModels: async () => [],
      getSession: async () => null,
      listSessions: async () => [],
      createSession: async () => ({ id: "ses_test", title: "Test Session" }),
      sendMessage: async () => ({}),
    },
    ...overrides,
  } as OpenCodeContext;
  return mock;
}
