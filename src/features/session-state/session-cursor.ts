type MessageTime =
  | { created?: number | string }
  | number
  | string
  | undefined

type MessageInfo = {
  id?: string
  time?: MessageTime
}

export type CursorMessage = {
  info?: MessageInfo
}

interface CursorState {
  lastKey?: string
  lastCount: number
}

const sessionCursors = new Map<string, CursorState>()

function buildMessageKey(message: CursorMessage, index: number): string {
  const id = message.info?.id
  if (id) return `id:${id}`

  const time = message.info?.time
  if (typeof time === "number" || typeof time === "string") {
    return `t:${time}:${index}`
  }

  const created = (time as { created?: number | string } | undefined)?.created
  if (typeof created === "number") {
    return `t:${created}:${index}`
  }
  if (typeof created === "string") {
    return `t:${created}:${index}`
  }

  return `i:${index}`
}

export function consumeNewMessages<T extends CursorMessage>(
  sessionId: string | undefined,
  messages: T[],
): T[] {
  if (!sessionId) return messages

  const keys = messages.map((message, index) => buildMessageKey(message, index))
  const cursor = sessionCursors.get(sessionId)
  let startIndex = 0

  if (cursor) {
    if (cursor.lastCount > messages.length) {
      startIndex = 0
    } else if (cursor.lastKey) {
      const lastIndex = keys.lastIndexOf(cursor.lastKey)
      if (lastIndex >= 0) {
        startIndex = lastIndex + 1
      } else {
        startIndex = 0
      }
    }
  }

  if (messages.length === 0) {
    sessionCursors.delete(sessionId)
  } else {
    sessionCursors.set(sessionId, {
      lastKey: keys[keys.length - 1],
      lastCount: messages.length,
    })
  }

  return messages.slice(startIndex)
}

export function resetMessageCursor(sessionId?: string): void {
  if (sessionId) {
    sessionCursors.delete(sessionId)
    return
  }
  sessionCursors.clear()
}
