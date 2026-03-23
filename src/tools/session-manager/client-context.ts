import type { OpenCodeContext } from "../../types/plugin"

let storedContext: OpenCodeContext | undefined

export function initSessionManagerContext(ctx: OpenCodeContext): void {
  storedContext = ctx
}

export function getSessionManagerContext(): OpenCodeContext {
  if (!storedContext) {
    throw new Error("Session manager context not initialized. Call initSessionManagerContext first.")
  }
  return storedContext
}
