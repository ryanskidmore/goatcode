import { z } from "zod"

export const grepOutputModes = ["content", "files_with_matches", "count"] as const

export const grepArgsSchema = {
  pattern: z.string().describe("The regex pattern to search for in file contents"),
  include: z.string().optional().describe("File pattern to include in the search (e.g. \"*.js\", \"*.{ts,tsx}\")"),
  path: z.string().optional().describe("The directory to search in. Defaults to the current working directory."),
  output_mode: z
    .enum(grepOutputModes)
    .optional()
    .describe(
      "Output mode: \"content\" shows matching lines, \"files_with_matches\" shows only file paths (default), \"count\" shows match counts per file.",
    ),
  head_limit: z.number().optional().describe("Limit output to first N entries. 0 or omitted means no limit."),
}

export type GrepArgs = z.infer<z.ZodObject<typeof grepArgsSchema>>
export type GrepOutput = string
