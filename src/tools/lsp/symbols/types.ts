import { z } from "zod";

export const lspSymbolsArgsSchema = z.object({
  filePath: z.string().describe("File path for LSP context"),
  scope: z
    .enum(["document", "workspace"])
    .default("document")
    .describe("'document' for file symbols, 'workspace' for project-wide search"),
  query: z.string().optional().describe("Symbol name to search (required for workspace scope)"),
  limit: z.number().optional().describe("Max results (default 50)"),
});

export type LspSymbolsArgs = z.infer<typeof lspSymbolsArgsSchema>;
