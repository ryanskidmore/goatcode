import { existsSync, readFileSync } from "node:fs"
import { dirname, isAbsolute, join, resolve } from "node:path"
import { log } from "../../shared/logger"

type ToolExecuteAfterInput = {
  tool?: string
}

type ToolExecuteAfterOutput = {
  title?: string
  output?: string
}

function resolveReadPath(workspaceDirectory: string, title?: string): string | null {
  if (!title) {
    return null
  }

  if (isAbsolute(title)) {
    return title
  }

  return resolve(workspaceDirectory, title)
}

export function createReadmeInjectorHandler(workspaceDirectory: string) {
  return async (input: unknown, output: unknown): Promise<void> => {
    const typedInput = input as ToolExecuteAfterInput
    const typedOutput = output as ToolExecuteAfterOutput

    if (typedInput.tool?.toLowerCase() !== "read") {
      return
    }

    const filePath = resolveReadPath(workspaceDirectory, typedOutput.title)
    if (!filePath || typeof typedOutput.output !== "string") {
      return
    }

    const readmePath = join(dirname(filePath), "README.md")
    if (!existsSync(readmePath)) {
      return
    }

    try {
      const content = readFileSync(readmePath, "utf8")
      typedOutput.output += `\n\n[Project README: ${readmePath}]\n${content}`
    } catch (error) {
      log("[readme-injector] Failed to read README.md", {
        readmePath,
        error: String(error),
      })
    }
  }
}
