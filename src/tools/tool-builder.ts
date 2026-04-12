import type { ToolDefinition } from "@opencode-ai/plugin";
import { DEFAULT_TOOL_TIMEOUT_MS, ToolTimeoutError, withToolTimeout } from "./tool-timeout";

export type ToolBuilderInput<
  TArgs extends ToolDefinition["args"] = ToolDefinition["args"],
  TExecuteArgs = Record<string, unknown>,
> = {
  name?: string;
  timeoutMs?: number;
  description: string;
  args: TArgs;
  execute: (
    args: TExecuteArgs,
    context: Parameters<ToolDefinition["execute"]>[1],
  ) => Promise<string>;
};

export function buildTool<
  TArgs extends ToolDefinition["args"] = ToolDefinition["args"],
  TExecuteArgs = Record<string, unknown>,
>(input: ToolBuilderInput<TArgs, TExecuteArgs>): ToolDefinition {
  const toolName = input.name ?? "unnamed-tool";
  const timeoutMs = input.timeoutMs ?? DEFAULT_TOOL_TIMEOUT_MS;

  return {
    description: input.description,
    args: input.args,
    execute: async (args, context) => {
      try {
        return await withToolTimeout(
          toolName,
          timeoutMs,
          input.execute(args as TExecuteArgs, context),
        );
      } catch (error) {
        if (error instanceof ToolTimeoutError) {
          return `Error: ${error.message}`;
        }
        throw error;
      }
    },
  };
}
