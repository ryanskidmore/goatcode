/**
 * Minimal provider registry — retains only utility functions still used
 * by the codebase. The model resolution pipeline in model-resolution-pipeline.ts
 * has replaced the old inference-based qualifyModel/resolveProvider system.
 */

export function isQualifiedModel(model: string): boolean {
  const slashIdx = model.indexOf("/");
  return slashIdx > 0 && slashIdx < model.length - 1;
}
