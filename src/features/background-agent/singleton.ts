import { BackgroundAgentManager } from "./manager"

export type BackgroundAgentContext = {
  manager: BackgroundAgentManager
}

let instance: BackgroundAgentContext | undefined

export function initBackgroundAgent(): BackgroundAgentContext {
  instance = {
    manager: new BackgroundAgentManager(),
  }
  return instance
}

export function getBackgroundAgent(): BackgroundAgentContext {
  if (!instance) {
    throw new Error("BackgroundAgent not initialized. Call initBackgroundAgent first.")
  }
  return instance
}

export function resetBackgroundAgent(): void {
  instance?.manager.dispose()
  instance = undefined
}
