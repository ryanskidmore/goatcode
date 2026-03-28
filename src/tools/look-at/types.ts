import { z } from "zod"

export const lookAtArgsSchema = z.object({
  file_path: z
    .string()
    .optional()
    .describe("Absolute path to the file to analyze"),
  goal: z
    .string()
    .describe("What specific information to extract from the file"),
  image_data: z
    .string()
    .optional()
    .describe("Base64 encoded image data (for clipboard/pasted images)"),
})

export type LookAtArgs = z.infer<typeof lookAtArgsSchema>

export const LOOK_AT_DESCRIPTION =
  "Extract basic information from media files (PDFs, images, diagrams) when a quick summary suffices over precise reading. Good for simple text-based content extraction without using the Read tool. NEVER use for visual precision, aesthetic evaluation, or exact accuracy — use Read tool instead for those cases."

export const LOOK_AT_AGENT_NAME = "advisor"
