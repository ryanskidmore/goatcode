import { z } from "zod"

export const globArgsSchema = {
  pattern: z.string().describe("The glob pattern to match files against"),
  path: z
    .string()
    .optional()
    .describe(
      "The directory to search in. If not specified, the current working directory will be used. IMPORTANT: Omit this field to use the default directory. DO NOT enter \"undefined\" or \"null\" - simply omit it for the default behavior. Must be a valid directory path if provided.",
    ),
}

export type GlobArgs = z.infer<z.ZodObject<typeof globArgsSchema>>
export type GlobOutput = string
