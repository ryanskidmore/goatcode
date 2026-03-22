export interface SessionState {
  sessionId: string
  model?: string
  agent?: string
  status?: "active" | "idle" | "completed"
  createdAt: number
  updatedAt: number
}

const store = new Map<string, SessionState>()

export function setSessionState(
  sessionId: string,
  state: Partial<Omit<SessionState, "sessionId" | "createdAt">>,
): void {
  const existing = store.get(sessionId)
  const now = Date.now()
  store.set(sessionId, {
    sessionId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    ...existing,
    ...state,
  })
}

export function getSessionState(sessionId: string): SessionState | undefined {
  return store.get(sessionId)
}

export function deleteSessionState(sessionId: string): void {
  store.delete(sessionId)
}

export function clearSessionStore(): void {
  store.clear()
}
