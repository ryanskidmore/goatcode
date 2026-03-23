import { z } from "zod"
import { AST_GREP_CLI_LANGUAGES } from "../search/types"

export const astGrepReplaceArgsSchema = {
  pattern: z.string().describe("AST pattern to match"),
  rewrite: z.string().describe("Replacement pattern (can use $VAR from pattern)"),
  lang: z.enum(AST_GREP_CLI_LANGUAGES).describe("Target language"),
  paths: z.array(z.string()).optional().describe("Paths to search"),
  globs: z.array(z.string()).optional().describe("Include/exclude globs"),
  dryRun: z.boolean().optional().describe("Preview changes without applying (default: true)"),
}

export type AstGrepReplaceArgs = z.infer<z.ZodObject<typeof astGrepReplaceArgsSchema>>
export type AstGrepReplaceOutput = string
