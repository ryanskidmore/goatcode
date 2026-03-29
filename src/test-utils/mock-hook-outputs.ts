/**
 * Mock factory functions for all 16 hook event output shapes.
 * Outputs are mutable objects that hooks modify in-place.
 */

export function makeToolOutput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ...overrides,
  };
}

export function makeConfigOutput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ...overrides,
  };
}

export function makeChatMessageOutput(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    parts: [
      {
        type: "text",
        text: "test message",
      },
    ],
    ...overrides,
  };
}

export function makeChatParamsOutput(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    options: {},
    ...overrides,
  };
}

export function makeChatHeadersOutput(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    ...overrides,
  };
}

export function makeEventOutput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ...overrides,
  };
}

export function makeToolExecuteBeforeOutput(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    args: {},
    ...overrides,
  };
}

export function makeToolExecuteAfterOutput(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    output: "tool result",
    title: "tool execution",
    metadata: {},
    ...overrides,
  };
}

export function makeExperimentalChatMessagesTransformOutput(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    messages: [
      {
        info: {
          role: "user",
          agent: "test-agent",
        },
        parts: [
          {
            type: "text",
            text: "test message",
          },
        ],
      },
    ],
    ...overrides,
  };
}

export function makeExperimentalChatSystemTransformOutput(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    title: "Test Title",
    output: "test output",
    ...overrides,
  };
}

export function makeToolDefinitionOutput(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    ...overrides,
  };
}

export function makePermissionAskOutput(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    ...overrides,
  };
}

export function makeCommandExecuteBeforeOutput(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    ...overrides,
  };
}

export function makeShellEnvOutput(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    ...overrides,
  };
}

export function makeExperimentalSessionCompactingOutput(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    ...overrides,
  };
}

export function makeExperimentalTextCompleteOutput(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    ...overrides,
  };
}
