import { z } from "zod"

export const interactiveBashArgsSchema = z.object({
  tmux_command: z
    .string()
    .describe(
      "The tmux command to execute (without 'tmux' prefix). Examples: new-session -d -s myapp, send-keys -t myapp \"vim\" Enter",
    ),
})

export type InteractiveBashArgs = z.infer<typeof interactiveBashArgsSchema>
