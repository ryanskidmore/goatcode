import type { ToolDefinition } from "@opencode-ai/plugin";

export type ToolBuilderInput<
  TArgs extends ToolDefinition["args"] = ToolDefinition["args"],
  TExecuteArgs = Record<string, unknown>,
> = {
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
  return {
    description: input.description,
    args: input.args,
    execute: (args, context) => input.execute(args as TExecuteArgs, context),
  };
}
