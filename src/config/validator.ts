import type { GoatCodeConfig } from "../types/config";
import { log } from "../shared/logger";
import { GoatCodeConfigSchema } from "./schema";

export type ValidationResult =
  | {
      success: true;
      config: GoatCodeConfig;
    }
  | {
      success: false;
      errors: string[];
    };

export function validateConfig(raw: unknown): ValidationResult {
  const result = GoatCodeConfigSchema.safeParse(raw);
  if (result.success) {
    return { success: true, config: result.data };
  }

  const errors = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  log("[config/validator] Validation failed", { errors });
  return { success: false, errors };
}
