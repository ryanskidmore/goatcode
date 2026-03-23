import { z } from "zod"

export const lspDiagnosticsArgsSchema = z.object({
  filePath: z.string(),
  severity: z
    .enum(["error", "warning", "information", "hint", "all"])
    .optional()
    .describe("Filter by severity level"),
  extension: z.string().optional().describe("Required if filePath is a directory. E.g., '.ts', '.py', '.go'"),
})

export type LspDiagnosticsArgs = z.infer<typeof lspDiagnosticsArgsSchema>
