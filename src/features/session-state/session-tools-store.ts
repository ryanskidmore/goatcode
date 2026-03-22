const store = new Map<string, Record<string, boolean>>()

export function setSessionTools(sessionId: string, tools: Record<string, boolean>): void {
  store.set(sessionId, { ...tools })
}

export function getSessionTools(sessionId: string): Record<string, boolean> | undefined {
  const tools = store.get(sessionId)
  return tools ? { ...tools } : undefined
}

export function deleteSessionTools(sessionId: string): void {
  store.delete(sessionId)
}

export function clearSessionTools(): void {
  store.clear()
}
