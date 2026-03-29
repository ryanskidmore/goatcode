import type { AgentConfig } from "../types/agent";

/**
 * Create a minimal mock AgentConfig for unit testing.
 */
export function createMockAgentConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    instructions: "You are a test agent.",
    model: "anthropic/claude-sonnet-4-6",
    temperature: 0.1,
    ...overrides,
  } as AgentConfig;
}
