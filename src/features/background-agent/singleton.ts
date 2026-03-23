import { BackgroundAgentManager } from "./manager"
import type { OpenCodeContext } from "../../types/plugin"

export const backgroundAgentManager = new BackgroundAgentManager()

let storedContext: OpenCodeContext | undefined

export function initBackgroundAgentContext(ctx: OpenCodeContext): void {
  storedContext = ctx
}

export function getBackgroundAgentContext(): OpenCodeContext {
  if (!storedContext) {
    throw new Error("BackgroundAgentManager context not initialized. Call initBackgroundAgentContext first.")
  }
  return storedContext
}
