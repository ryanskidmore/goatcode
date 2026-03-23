import { z } from "zod"

export const AST_GREP_CLI_LANGUAGES = [
  "bash",
  "c",
  "cpp",
  "csharp",
  "css",
  "elixir",
  "go",
  "haskell",
  "html",
  "java",
  "javascript",
  "json",
  "kotlin",
  "lua",
  "nix",
  "php",
  "python",
  "ruby",
  "rust",
  "scala",
  "solidity",
  "swift",
  "typescript",
  "tsx",
  "yaml",
] as const

export const astGrepSearchArgsSchema = {
  pattern: z.string().describe("AST pattern with meta-variables ($VAR, $$$). Must be complete AST node."),
  lang: z.enum(AST_GREP_CLI_LANGUAGES).describe("Target language"),
  paths: z.array(z.string()).optional().describe("Paths to search (default: ['.'])"),
  globs: z.array(z.string()).optional().describe("Include/exclude globs (prefix ! to exclude)"),
  context: z.number().optional().describe("Context lines around match"),
}

export type AstGrepSearchArgs = z.infer<z.ZodObject<typeof astGrepSearchArgsSchema>>
export type AstGrepSearchOutput = string
