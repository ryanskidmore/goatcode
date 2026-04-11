import { z } from "zod";

export const lspRenameArgsSchema = z.object({
  filePath: z.string(),
  line: z.number().int().min(1).describe("1-based"),
  character: z.number().int().min(0).describe("0-based"),
  newName: z.string().min(1).describe("New symbol name"),
});

export type LspRenameArgs = z.infer<typeof lspRenameArgsSchema>;
