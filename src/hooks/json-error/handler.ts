import type { PluginHookContributions } from "../../types/hook"
import { log } from "../../shared/logger"

export const JSON_ERROR_PATTERNS = [
  /json parse error/i,
  /failed to parse json/i,
  /invalid json/i,
  /malformed json/i,
  /unexpected end of json input/i,
  /syntaxerror:\s*unexpected token.*json/i,
] as const

const JSON_ERROR_RECOVERY_MARKER = "[JSON ERROR RECOVERY]"

export const JSON_ERROR_RECOVERY_MESSAGE = `${JSON_ERROR_RECOVERY_MARKER}\nTool output appears to be malformed JSON. Re-check the response shape, validate it as strict JSON, and retry with a corrected payload or parser expectation.`

type PostToolUseHook = NonNullable<PluginHookContributions["tool.execute.after"]>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function looksLikeJson(text: string): boolean {
  const trimmed = text.trim()
  return trimmed.startsWith("{") || trimmed.startsWith("[")
}

function isValidJson(text: string): boolean {
  try {
    JSON.parse(text)
    return true
  } catch {
    return false
  }
}

function isJsonExpected(output: Record<string, unknown>): boolean {
  const title = output.title
  const metadata = output.metadata

  if (typeof title === "string" && /json/i.test(title)) {
    return true
  }

  if (!isRecord(metadata)) {
    return false
  }

  return (
    metadata.format === "json" ||
    metadata.expectedFormat === "json" ||
    metadata.expectsJson === true
  )
}

export function createJsonErrorHandler(): PostToolUseHook {
  return async (_input: unknown, output: unknown) => {
    if (!isRecord(output)) {
      return
    }

    const toolOutput = output.output
    if (typeof toolOutput !== "string") {
      return
    }

    if (toolOutput.includes(JSON_ERROR_RECOVERY_MARKER)) {
      return
    }

    const hasJsonErrorPattern = JSON_ERROR_PATTERNS.some((pattern) => pattern.test(toolOutput))
    const malformedJson = looksLikeJson(toolOutput) && !isValidJson(toolOutput)
    const shouldRecover = hasJsonErrorPattern || (isJsonExpected(output) && malformedJson)

    if (!shouldRecover) {
      return
    }

    output.output = `${toolOutput}\n${JSON_ERROR_RECOVERY_MESSAGE}`
    log("[json-error] injected JSON recovery message")
  }
}
