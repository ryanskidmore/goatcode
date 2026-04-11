export class ConcurrencyManager {
  private readonly limit: number;
  private counts = new Map<string, number>();
  private queues = new Map<string, Array<() => void>>();

  constructor(limit = 10) {
    this.limit = limit;
  }

  async acquire(key: string): Promise<void> {
    const current = this.counts.get(key) ?? 0;
    if (current < this.limit) {
      this.counts.set(key, current + 1);
      return;
    }

    return new Promise<void>((resolve) => {
      const queue = this.queues.get(key) ?? [];
      queue.push(resolve);
      this.queues.set(key, queue);
    });
  }

  release(key: string): void {
    const queue = this.queues.get(key) ?? [];
    if (queue.length > 0) {
      const next = queue.shift();
      this.queues.set(key, queue);
      next?.();
      return;
    }

    const current = this.counts.get(key) ?? 0;
    this.counts.set(key, Math.max(0, current - 1));
  }

  getCount(key: string): number {
    return this.counts.get(key) ?? 0;
  }

  getQueueLength(key: string): number {
    return (this.queues.get(key) ?? []).length;
  }
}
