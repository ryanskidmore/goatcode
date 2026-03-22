import type { OpenHeadConfig } from "../types/config"
import { log } from "../shared/logger"
import { OpenHeadConfigSchema } from "./schema"

export type ValidationResult =
  | {
      success: true
      config: OpenHeadConfig
    }
  | {
      success: false
      errors: string[]
    }

export function validateConfig(raw: unknown): ValidationResult {
  const result = OpenHeadConfigSchema.safeParse(raw)
  if (result.success) {
    return { success: true, config: result.data }
  }

  const errors = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
  log("[config/validator] Validation failed", { errors })
  return { success: false, errors }
}
