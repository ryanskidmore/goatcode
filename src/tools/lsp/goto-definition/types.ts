import { z } from "zod";

export const lspGotoDefinitionArgsSchema = z.object({
  filePath: z.string(),
  line: z.number().int().min(1).describe("1-based"),
  character: z.number().int().min(0).describe("0-based"),
});

export type LspGotoDefinitionArgs = z.infer<typeof lspGotoDefinitionArgsSchema>;
