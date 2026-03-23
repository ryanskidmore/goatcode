import { z } from "zod"

export const lspPrepareRenameArgsSchema = z.object({
  filePath: z.string(),
  line: z.number().min(1).describe("1-based"),
  character: z.number().min(0).describe("0-based"),
})

export type LspPrepareRenameArgs = z.infer<typeof lspPrepareRenameArgsSchema>
