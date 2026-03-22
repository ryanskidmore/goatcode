import { describe, expect, test } from "bun:test"

import { ConcurrencyManager } from "./concurrency"

describe("ConcurrencyManager", () => {
  test("#given limit=2 #when two tasks acquire #then running count is 2", async () => {
    //#given
    const manager = new ConcurrencyManager(2)

    //#when
    await manager.acquire("model:a")
    await manager.acquire("model:a")

    //#then
    expect(manager.getCount("model:a")).toBe(2)
  })

  test("#given limit=2 and two running #when third acquires #then it queues without immediate resolution", async () => {
    //#given
    const manager = new ConcurrencyManager(2)
    await manager.acquire("model:a")
    await manager.acquire("model:a")
    let resolved = false

    //#when
    const thirdAcquire = manager.acquire("model:a").then(() => {
      resolved = true
    })
    await Promise.resolve()

    //#then
    expect(manager.getQueueLength("model:a")).toBe(1)
    expect(resolved).toBeFalse()

    manager.release("model:a")
    await thirdAcquire
    manager.release("model:a")
    manager.release("model:a")
  })

  test("#given limit=2 and queue exists #when one releases #then queued task resolves", async () => {
    //#given
    const manager = new ConcurrencyManager(2)
    await manager.acquire("model:a")
    await manager.acquire("model:a")
    let resolved = false
    const thirdAcquire = manager.acquire("model:a").then(() => {
      resolved = true
    })
    await Promise.resolve()
    expect(resolved).toBeFalse()

    //#when
    manager.release("model:a")
    await thirdAcquire

    //#then
    expect(resolved).toBeTrue()
    expect(manager.getQueueLength("model:a")).toBe(0)
    expect(manager.getCount("model:a")).toBe(2)

    manager.release("model:a")
    manager.release("model:a")
  })
})
