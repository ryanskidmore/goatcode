import { z } from "zod";

export const lspFindReferencesArgsSchema = z.object({
  filePath: z.string(),
  line: z.number().int().min(1).describe("1-based"),
  character: z.number().int().min(0).describe("0-based"),
  includeDeclaration: z.boolean().optional().describe("Include the declaration itself"),
});

export type LspFindReferencesArgs = z.infer<typeof lspFindReferencesArgsSchema>;
