/**
 * Mock factory functions for all 16 hook event input shapes.
 * Each factory: `make{EventName}Input(overrides?)` returning the typed input object.
 */

export function makeToolInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ...overrides,
  };
}

export function makeConfigInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ...overrides,
  };
}

export function makeChatMessageInput(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    sessionID: "ses_test",
    ...overrides,
  };
}

export function makeChatParamsInput(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    sessionID: "ses_test",
    model: {
      providerID: "anthropic",
      modelID: "claude-3-5-sonnet",
    },
    ...overrides,
  };
}

export function makeChatHeadersInput(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    ...overrides,
  };
}

export function makeEventInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    event: {
      type: "session.created",
      properties: {
        info: {
          id: "evt_test",
        },
      },
    },
    ...overrides,
  };
}

export function makeToolExecuteBeforeInput(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    tool: "edit",
    sessionID: "ses_test",
    ...overrides,
  };
}

export function makeToolExecuteAfterInput(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    tool: "edit",
    ...overrides,
  };
}

export function makeExperimentalChatMessagesTransformInput(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    ...overrides,
  };
}

export function makeExperimentalChatSystemTransformInput(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    tool: "delegate-task",
    ...overrides,
  };
}

export function makeToolDefinitionInput(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    ...overrides,
  };
}

export function makePermissionAskInput(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    ...overrides,
  };
}

export function makeCommandExecuteBeforeInput(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    ...overrides,
  };
}

export function makeShellEnvInput(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    ...overrides,
  };
}

export function makeExperimentalSessionCompactingInput(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    ...overrides,
  };
}

export function makeExperimentalTextCompleteInput(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    ...overrides,
  };
}
