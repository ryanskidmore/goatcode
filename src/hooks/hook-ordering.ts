import type { PluginHookHandler } from "../types/plugin";

const HOOK_PRIORITY_SYMBOL = Symbol.for("goatcode.hookPriority");

export type PrioritizedHandler = {
  handler: PluginHookHandler;
  priority: number;
  order: number;
};

export function sortByPriority(handlers: PrioritizedHandler[]): PluginHookHandler[] {
  return [...handlers]
    .sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.order - b.order;
    })
    .map((h) => h.handler);
}

export function getHookPriority(handler: PluginHookHandler): number {
  const value = (handler as PluginHookHandler & { [HOOK_PRIORITY_SYMBOL]?: unknown })[
    HOOK_PRIORITY_SYMBOL
  ];
  return typeof value === "number" ? value : 0;
}

export function withPriority<T extends PluginHookHandler>(handler: T, priority: number): T {
  const wrapped = async function (this: unknown, ...args: unknown[]) {
    await (handler as (...args: unknown[]) => unknown).apply(this, args);
  } as T;

  Object.defineProperty(wrapped, HOOK_PRIORITY_SYMBOL, {
    configurable: false,
    enumerable: false,
    writable: false,
    value: priority,
  });
  return wrapped;
}
