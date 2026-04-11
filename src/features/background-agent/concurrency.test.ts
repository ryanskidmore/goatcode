import { describe, expect, it, test } from "bun:test";

import { ConcurrencyManager } from "./concurrency";

describe("ConcurrencyManager", () => {
  test("#given limit=2 #when two tasks acquire #then running count is 2", async () => {
    //#given
    const manager = new ConcurrencyManager(2);

    //#when
    await manager.acquire("model:a");
    await manager.acquire("model:a");

    //#then
    expect(manager.getCount("model:a")).toBe(2);
  });

  test("#given limit=2 and two running #when third acquires #then it queues without immediate resolution", async () => {
    //#given
    const manager = new ConcurrencyManager(2);
    await manager.acquire("model:a");
    await manager.acquire("model:a");
    let resolved = false;

    //#when
    const thirdAcquire = manager.acquire("model:a").then(() => {
      resolved = true;
    });
    await Promise.resolve();

    //#then
    expect(manager.getQueueLength("model:a")).toBe(1);
    expect(resolved).toBeFalse();

    manager.release("model:a");
    await thirdAcquire;
    manager.release("model:a");
    manager.release("model:a");
  });

  test("#given limit=2 and queue exists #when one releases #then queued task resolves", async () => {
    //#given
    const manager = new ConcurrencyManager(2);
    await manager.acquire("model:a");
    await manager.acquire("model:a");
    let resolved = false;
    const thirdAcquire = manager.acquire("model:a").then(() => {
      resolved = true;
    });
    await Promise.resolve();
    expect(resolved).toBeFalse();

    //#when
    manager.release("model:a");
    await thirdAcquire;

    //#then
    expect(resolved).toBeTrue();
    expect(manager.getQueueLength("model:a")).toBe(0);
    expect(manager.getCount("model:a")).toBe(2);

    manager.release("model:a");
    manager.release("model:a");
  });
});

// ─── F15: depth-keyed concurrency pools prevent starvation ──────────────────

describe("F15 — depth-keyed concurrency prevents parent/child starvation", () => {
  it("parents (depth:0) and children (depth:1) use separate pools", async () => {
    const { ConcurrencyManager } = await import("./concurrency");

    const mgr = new ConcurrencyManager(10);

    for (let i = 0; i < 10; i++) {
      await mgr.acquire("anthropic/claude-opus-4-6:0");
    }

    expect(mgr.getCount("anthropic/claude-opus-4-6:0")).toBe(10);

    await mgr.acquire("anthropic/claude-opus-4-6:1");
    expect(mgr.getCount("anthropic/claude-opus-4-6:1")).toBe(1);

    expect(mgr.getQueueLength("anthropic/claude-opus-4-6:1")).toBe(0);
    expect(mgr.getQueueLength("anthropic/claude-opus-4-6:0")).toBe(0);
  });

  it("concurrency default is now 10 (was 5)", async () => {
    const { ConcurrencyManager } = await import("./concurrency");
    const mgr = new ConcurrencyManager();
    for (let i = 0; i < 10; i++) {
      await mgr.acquire("model:0");
    }
    expect(mgr.getCount("model:0")).toBe(10);
    expect(mgr.getQueueLength("model:0")).toBe(0);

    let resolved = false;
    mgr.acquire("model:0").then(() => {
      resolved = true;
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(resolved).toBe(false);
    expect(mgr.getQueueLength("model:0")).toBe(1);
  });
});
